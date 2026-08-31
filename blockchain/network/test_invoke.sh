export CORE_PEER_LOCALMSPID=PoliceDeptMSP
export CORE_PEER_ADDRESS=peer0.police.slidms.gov.in:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/police.slidms.gov.in/peers/peer0.police.slidms.gov.in/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/police.slidms.gov.in/users/Admin@police.slidms.gov.in/msp

peer chaincode invoke -o orderer.slidms.gov.in:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/slidms.gov.in/orderers/orderer.slidms.gov.in/tls/ca.crt -C slidms-channel -n slidms-cc --peerAddresses peer0.police.slidms.gov.in:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/police.slidms.gov.in/peers/peer0.police.slidms.gov.in/tls/ca.crt --peerAddresses peer0.forensic.slidms.gov.in:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/forensic.slidms.gov.in/peers/peer0.forensic.slidms.gov.in/tls/ca.crt -c '{"Args":["DocumentContract:RegisterDocument","DOC-001","CASE-101","FIR_Report.pdf","FIR","e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","USER-001","Inspector Vikram","CONFIDENTIAL","1","2026-08-31T03:00:00Z"]}'
