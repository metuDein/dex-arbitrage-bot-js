/**
 * @typedef {Object} Settings
 * @property {number} minPriceDiffPerc - Minimum price difference percentage
 * @property {string} wsRPC - WebSocket RPC URL
 * @property {import('ethers').Wallet} wallet - Ethers wallet instance
 * @property {import('ethers').Provider} provider - Ethers provider instance
 */

/**
 * @typedef {Object} DexFactory
 * @property {string} factory - Factory contract address
 * @property {number} version - DEX version (2 or 3)
 */

/**
 * @typedef {Object} DexFactoryReturn
 * @property {string} pool - Pool address (index 0)
 * @property {number} wethLiq - WETH liquidity (index 1)
 * @property {number} tokenLiq - Token liquidity (index 2)
 * @property {number} version - DEX version (index 3)
 * @property {number} poolFee - Pool fee (index 4)
 * @property {number} sqrtPriceX96 - Square root price X96 (index 5)
 * @property {boolean} tk0IsWeth - Whether token0 is WETH (index 6)
 */

/**
 * @typedef {Object} Pool
 * @property {bigint} weth - WETH amount
 * @property {bigint} token - Token amount
 */

// Export empty object since this is just for type definitions
module.exports = {};
