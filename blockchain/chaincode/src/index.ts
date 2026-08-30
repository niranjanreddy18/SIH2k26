/*
 * SLIDMS Chaincode Entry Point
 * Exports the DocumentContract for Fabric peer to discover and instantiate.
 */

import { DocumentContract } from './documentContract';

export { DocumentContract } from './documentContract';

export const contracts: any[] = [DocumentContract];
