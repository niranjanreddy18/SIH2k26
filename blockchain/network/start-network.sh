#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# SLIDMS Fabric Network — Start Script
# Generates crypto material, creates channel, deploys chaincode
# Run from: blockchain/network/
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOCKCHAIN_DIR="$(dirname "$SCRIPT_DIR")"
CHANNEL_NAME="slidms-channel"
CHAINCODE_NAME="slidms-cc"
CHAINCODE_VERSION="1.0"
CHAINCODE_PATH="${BLOCKCHAIN_DIR}/chaincode"

# Ensure blockchain/bin is on PATH
export PATH="${BLOCKCHAIN_DIR}/bin:$PATH"
export FABRIC_CFG_PATH="${SCRIPT_DIR}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✅]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
error() { echo -e "${RED}[❌]${NC} $1"; }

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  SLIDMS — Hyperledger Fabric Network Startup"
echo "  Organizations: PoliceDeptOrg, ForensicLabOrg, JudiciaryOrg"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Step 0: Check / Download Fabric Binaries & Docker Images ────────────────
if ! command -v cryptogen &> /dev/null || ! command -v configtxgen &> /dev/null || ! command -v peer &> /dev/null; then
  warn "Fabric binaries (cryptogen, configtxgen, peer) not found on PATH."
  info "Downloading official Hyperledger Fabric 2.5 binaries and Docker images..."
  
  mkdir -p "${BLOCKCHAIN_DIR}/bin"
  mkdir -p "${BLOCKCHAIN_DIR}/config"
  cd "${BLOCKCHAIN_DIR}"
  
  curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
  chmod +x install-fabric.sh
  ./install-fabric.sh --fabric-version 2.5.9 --ca-version 1.5.12 binary docker
  
  export PATH="${BLOCKCHAIN_DIR}/bin:$PATH"
  cd "${SCRIPT_DIR}"
  success "Hyperledger Fabric binaries and images installed successfully"
fi

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
  warn "jq is not installed. Installing jq via apt..."
  sudo apt-get update -qq && sudo apt-get install -y -qq jq || true
fi

# ─── Step 1: Clean up any previous state ──────────────────────────────────────
info "Cleaning up previous network artifacts..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yaml" down --volumes --remove-orphans 2>/dev/null || true
rm -rf "${BLOCKCHAIN_DIR}/organizations"
rm -rf "${BLOCKCHAIN_DIR}/channel-artifacts"
mkdir -p "${BLOCKCHAIN_DIR}/organizations"
mkdir -p "${BLOCKCHAIN_DIR}/channel-artifacts"
success "Previous state cleaned"

# ─── Step 2: Generate crypto material using cryptogen ─────────────────────────
info "Generating cryptographic material for all organizations..."

cat > "${BLOCKCHAIN_DIR}/organizations/crypto-config.yaml" << 'CRYPTOEOF'
OrdererOrgs:
  - Name: Orderer
    Domain: slidms.gov.in
    EnableNodeOUs: true
    Specs:
      - Hostname: orderer

PeerOrgs:
  - Name: PoliceDept
    Domain: police.slidms.gov.in
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1

  - Name: ForensicLab
    Domain: forensic.slidms.gov.in
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1

  - Name: Judiciary
    Domain: judiciary.slidms.gov.in
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1
CRYPTOEOF

cryptogen generate --config="${BLOCKCHAIN_DIR}/organizations/crypto-config.yaml" \
  --output="${BLOCKCHAIN_DIR}/organizations"
success "Crypto material generated for 3 orgs + orderer"

# ─── Step 3: Generate channel genesis block ───────────────────────────────────
info "Generating channel genesis block for '${CHANNEL_NAME}'..."

configtxgen -profile SLIDMSGenesis \
  -outputBlock "${BLOCKCHAIN_DIR}/channel-artifacts/${CHANNEL_NAME}.block" \
  -channelID "${CHANNEL_NAME}"
success "Channel genesis block created"

# ─── Step 4: Start Docker containers ─────────────────────────────────────────
info "Starting Fabric Docker containers (orderer, 3 peers, 3 CouchDB, 3 CAs, CLI)..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yaml" up -d
success "All containers started"

# Wait for containers to be ready
info "Waiting for containers to initialize (15 seconds)..."
sleep 15

# ─── Step 5: Join channel ────────────────────────────────────────────────────
info "Creating and joining channel '${CHANNEL_NAME}'..."

# Orderer admin: create channel
osnadmin channel join \
  --channelID "${CHANNEL_NAME}" \
  --config-block "${BLOCKCHAIN_DIR}/channel-artifacts/${CHANNEL_NAME}.block" \
  -o localhost:7053 \
  --ca-file "${BLOCKCHAIN_DIR}/organizations/ordererOrganizations/slidms.gov.in/orderers/orderer.slidms.gov.in/msp/tlscacerts/tlsca.slidms.gov.in-cert.pem" \
  --client-cert "${BLOCKCHAIN_DIR}/organizations/ordererOrganizations/slidms.gov.in/orderers/orderer.slidms.gov.in/tls/server.crt" \
  --client-key "${BLOCKCHAIN_DIR}/organizations/ordererOrganizations/slidms.gov.in/orderers/orderer.slidms.gov.in/tls/server.key"
success "Channel created on orderer"

# Join Police peer
info "Joining peer0.police to channel..."
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="PoliceDeptMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/peers/peer0.police.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/users/Admin@police.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer channel join -b "${BLOCKCHAIN_DIR}/channel-artifacts/${CHANNEL_NAME}.block"
success "peer0.police joined"

# Join Forensic peer
info "Joining peer0.forensic to channel..."
export CORE_PEER_LOCALMSPID="ForensicLabMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/forensic.slidms.gov.in/peers/peer0.forensic.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/forensic.slidms.gov.in/users/Admin@forensic.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:9051

peer channel join -b "${BLOCKCHAIN_DIR}/channel-artifacts/${CHANNEL_NAME}.block"
success "peer0.forensic joined"

# Join Judiciary peer
info "Joining peer0.judiciary to channel..."
export CORE_PEER_LOCALMSPID="JudiciaryMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/judiciary.slidms.gov.in/peers/peer0.judiciary.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/judiciary.slidms.gov.in/users/Admin@judiciary.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:11051

peer channel join -b "${BLOCKCHAIN_DIR}/channel-artifacts/${CHANNEL_NAME}.block"
success "peer0.judiciary joined"

# ─── Step 6: Build & Package chaincode ───────────────────────────────────────
info "Building TypeScript chaincode..."
cd "${CHAINCODE_PATH}"
npm install
npm run build
success "Chaincode compiled"

info "Packaging chaincode '${CHAINCODE_NAME}'..."
cd "${BLOCKCHAIN_DIR}"
peer lifecycle chaincode package "${BLOCKCHAIN_DIR}/channel-artifacts/${CHAINCODE_NAME}.tar.gz" \
  --path "${CHAINCODE_PATH}" \
  --lang node \
  --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
success "Chaincode packaged"

# ─── Step 7: Install chaincode on all peers ──────────────────────────────────
info "Installing chaincode on peer0.police..."
export CORE_PEER_LOCALMSPID="PoliceDeptMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/peers/peer0.police.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/users/Admin@police.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install "${BLOCKCHAIN_DIR}/channel-artifacts/${CHAINCODE_NAME}.tar.gz"
success "Installed on police peer"

info "Installing chaincode on peer0.forensic..."
export CORE_PEER_LOCALMSPID="ForensicLabMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/forensic.slidms.gov.in/peers/peer0.forensic.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/forensic.slidms.gov.in/users/Admin@forensic.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode install "${BLOCKCHAIN_DIR}/channel-artifacts/${CHAINCODE_NAME}.tar.gz"
success "Installed on forensic peer"

info "Installing chaincode on peer0.judiciary..."
export CORE_PEER_LOCALMSPID="JudiciaryMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/judiciary.slidms.gov.in/peers/peer0.judiciary.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/judiciary.slidms.gov.in/users/Admin@judiciary.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:11051
peer lifecycle chaincode install "${BLOCKCHAIN_DIR}/channel-artifacts/${CHAINCODE_NAME}.tar.gz"
success "Installed on judiciary peer"

# ─── Step 8: Approve & Commit chaincode ──────────────────────────────────────
info "Getting chaincode package ID..."
export CORE_PEER_LOCALMSPID="PoliceDeptMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/peers/peer0.police.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/users/Admin@police.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:7051

CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[0].package_id')
info "Package ID: ${CC_PACKAGE_ID}"

# Approve for PoliceDept
info "Approving chaincode for PoliceDeptMSP..."
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.slidms.gov.in \
  --tls \
  --cafile "${BLOCKCHAIN_DIR}/organizations/ordererOrganizations/slidms.gov.in/orderers/orderer.slidms.gov.in/msp/tlscacerts/tlsca.slidms.gov.in-cert.pem" \
  --channelID "${CHANNEL_NAME}" \
  --name "${CHAINCODE_NAME}" \
  --version "${CHAINCODE_VERSION}" \
  --package-id "${CC_PACKAGE_ID}" \
  --sequence 1
success "PoliceDept approved"

# Approve for ForensicLab
info "Approving chaincode for ForensicLabMSP..."
export CORE_PEER_LOCALMSPID="ForensicLabMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/forensic.slidms.gov.in/peers/peer0.forensic.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/forensic.slidms.gov.in/users/Admin@forensic.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.slidms.gov.in \
  --tls \
  --cafile "${BLOCKCHAIN_DIR}/organizations/ordererOrganizations/slidms.gov.in/orderers/orderer.slidms.gov.in/msp/tlscacerts/tlsca.slidms.gov.in-cert.pem" \
  --channelID "${CHANNEL_NAME}" \
  --name "${CHAINCODE_NAME}" \
  --version "${CHAINCODE_VERSION}" \
  --package-id "${CC_PACKAGE_ID}" \
  --sequence 1
success "ForensicLab approved"

# Approve for Judiciary
info "Approving chaincode for JudiciaryMSP..."
export CORE_PEER_LOCALMSPID="JudiciaryMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/judiciary.slidms.gov.in/peers/peer0.judiciary.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/judiciary.slidms.gov.in/users/Admin@judiciary.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:11051
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.slidms.gov.in \
  --tls \
  --cafile "${BLOCKCHAIN_DIR}/organizations/ordererOrganizations/slidms.gov.in/orderers/orderer.slidms.gov.in/msp/tlscacerts/tlsca.slidms.gov.in-cert.pem" \
  --channelID "${CHANNEL_NAME}" \
  --name "${CHAINCODE_NAME}" \
  --version "${CHAINCODE_VERSION}" \
  --package-id "${CC_PACKAGE_ID}" \
  --sequence 1
success "Judiciary approved"

# Commit chaincode
info "Committing chaincode definition to channel..."
export CORE_PEER_LOCALMSPID="PoliceDeptMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/peers/peer0.police.slidms.gov.in/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/users/Admin@police.slidms.gov.in/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.slidms.gov.in \
  --tls \
  --cafile "${BLOCKCHAIN_DIR}/organizations/ordererOrganizations/slidms.gov.in/orderers/orderer.slidms.gov.in/msp/tlscacerts/tlsca.slidms.gov.in-cert.pem" \
  --channelID "${CHANNEL_NAME}" \
  --name "${CHAINCODE_NAME}" \
  --version "${CHAINCODE_VERSION}" \
  --sequence 1 \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${BLOCKCHAIN_DIR}/organizations/peerOrganizations/police.slidms.gov.in/peers/peer0.police.slidms.gov.in/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${BLOCKCHAIN_DIR}/organizations/peerOrganizations/forensic.slidms.gov.in/peers/peer0.forensic.slidms.gov.in/tls/ca.crt" \
  --peerAddresses localhost:11051 \
  --tlsRootCertFiles "${BLOCKCHAIN_DIR}/organizations/peerOrganizations/judiciary.slidms.gov.in/peers/peer0.judiciary.slidms.gov.in/tls/ca.crt"
success "Chaincode committed to channel"

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ SLIDMS Fabric Network is LIVE"
echo ""
echo "  Channel:     ${CHANNEL_NAME}"
echo "  Chaincode:   ${CHAINCODE_NAME} v${CHAINCODE_VERSION}"
echo "  Organizations:"
echo "    🏛️  PoliceDeptMSP   → peer0.police.slidms.gov.in:7051"
echo "    🔬 ForensicLabMSP  → peer0.forensic.slidms.gov.in:9051"
echo "    ⚖️  JudiciaryMSP    → peer0.judiciary.slidms.gov.in:11051"
echo "  Orderer:     orderer.slidms.gov.in:7050 (Raft)"
echo "  CouchDB:     localhost:5984 / 7984 / 8984"
echo ""
echo "  To test: peer chaincode invoke ... -C slidms-channel -n slidms-cc"
echo "═══════════════════════════════════════════════════════════════"
echo ""
