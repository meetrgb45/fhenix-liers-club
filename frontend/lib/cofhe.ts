import { createCofheConfig, createCofheClient } from '@cofhe/sdk/web';
import { arbSepolia } from '@cofhe/sdk/chains';

export const cofheConfig = createCofheConfig({ supportedChains: [arbSepolia] });
export const cofheClient = createCofheClient(cofheConfig);
