export CORE_PEER_LOCALMSPID=PoliceDeptMSP
export CORE_PEER_ADDRESS=peer0.police.slidms.gov.in:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/police.slidms.gov.in/peers/peer0.police.slidms.gov.in/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/police.slidms.gov.in/users/Admin@police.slidms.gov.in/msp

peer chaincode query -C slidms-channel -n slidms-cc -c '{"Args":["DocumentContract:QueryDocument","DOC-001"]}'
