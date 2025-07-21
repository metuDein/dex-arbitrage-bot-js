const { ethers } = require("ethers");
const func = require("./helperfunc");
const path = require("path");
const getterAbi = require("./abi/Getter.json");
const executeSwapAbi = require("./abi/Executeswap.json");
const uniswapV2poolAbi = require("./abi/UniV2pool.json");

const ADDRESS = func.loadYaml(path.join(__dirname, "./address.yaml"));

const v2PoolSwapSig = "Swap(address,uint256,uint256,uint256,uint256,address)";
const v2PoolSwapSigBytes = ethers.keccak256(ethers.toUtf8Bytes(v2PoolSwapSig));

const v3PoolSwapSig = "Swap(address,address,int256,int256,uint160,uint128,int24)";
const v3PoolSwapSigBytes = ethers.keccak256(ethers.toUtf8Bytes(v3PoolSwapSig));

/**
 * Main arbitrage bot module
 */
class Module {
    /**
     * @param {import('./types').Settings} settings - Bot settings
     */
    constructor(settings) {
        this.settings = settings;
    }

    async initialize() {
        console.log(func.color.FgCyan + "Initializing...");

        // Some check on user wallet and approval
        const [allowance, balance] = await Promise.all([
            func.ERC20contract(ADDRESS.WETH, this.settings.provider).allowance(this.settings.wallet.address, this.executeSwap().target),
            func.ERC20contract(ADDRESS.WETH, this.settings.provider).balanceOf(this.settings.wallet.address)
        ]);

        if (balance < BigInt(func.towei("0.0008", 18))) {
            console.log(`${func.color.FgRed}Low balance!\nWallet Balance: ${func.fromwei(balance.toString(), 18)} WETH`);
            process.exit();
        }

        if (allowance === BigInt(0)) {
            await func.ERC20contract(ADDRESS.WETH, this.settings.wallet).approve(
                this.executeSwap().target,
                "57896044618658097711785492504343953926634992332820282019728792003956564819967"
            );
        }

        console.log(func.color.FgGreen + "Initialization completed" + func.color.Reset);
    }

    /**
     * Get getter contract instance
     * @returns {ethers.Contract}
     */
    getterContract() {
        return new ethers.Contract(
            "0x9FC8dA750c5D1e831a4AED1a8E54EfEB82A9adAc",
            getterAbi,
            this.settings.provider
        );
    }

    /**
     * Get execute swap contract instance
     * @param {ethers.Provider|ethers.Wallet} provider - Provider or wallet
     * @returns {ethers.Contract}
     */
    executeSwap(provider = this.settings.wallet) {
        return new ethers.Contract(
            "0x0058977AE90652128779ad480473977cA7B74e8E",
            executeSwapAbi,
            provider
        );
    }

    /**
     * Calculate price for V2 pool
     * @param {import('./types').Pool} poolLiqWethTk - Pool liquidity data
     * @param {number} decimal - Token decimals
     * @returns {number} Calculated price
     */
    calcPriceV2(poolLiqWethTk, decimal) {
        const price = parseFloat(func.fromwei(poolLiqWethTk.weth.toString(), 18)) /
                     parseFloat(func.fromwei(poolLiqWethTk.token.toString(), decimal));
        return price;
    }

    /**
     * Calculate price for V3 pool
     * @param {number} sqrtPriceX96 - Square root price X96
     * @param {number} decimal - Token decimals
     * @param {boolean} tk0IsWeth - Whether token0 is WETH
     * @returns {number} Calculated price
     */
    calcPriceV3(sqrtPriceX96, decimal, tk0IsWeth) {
        const price = 1 / (sqrtPriceX96 / 2**96) **2;
        const formatedPrice10 = price / (10**18 / 10**decimal);
        const formatedPrice01 = (10**decimal / 10**18 ) / price;
        return tk0IsWeth ? formatedPrice10: formatedPrice01;
    }

    /**
     * Calculate optimal trade volume
     * @param {bigint} poolAliq - Pool A liquidity
     * @param {bigint} poolBliq - Pool B liquidity
     * @param {number} price_impact - Price impact percentage
     * @param {number} poolFeeA - Pool A fee (default 3000)
     * @param {number} poolFeeB - Pool B fee (default 3000)
     * @returns {number} Trade volume
     */
    calc_trade_volume(poolAliq, poolBliq, price_impact, poolFeeA = 3000, poolFeeB = 3000) {
        const pool_a_liq = parseFloat(func.fromwei(poolAliq.toString(), 18));
        const pool_b_liq = parseFloat(func.fromwei(poolBliq.toString(), 18));
        const max_price_impact_converted = price_impact / 100;
        const fee_converted_a = poolFeeA / 10**6;
        const fee_converted_b = poolFeeB / 10**6;

        const trade_volume_a = (pool_a_liq * max_price_impact_converted) / ((1 - max_price_impact_converted) * (1 - fee_converted_a));
        const trade_volume_b = (pool_b_liq * max_price_impact_converted) / ((1 - max_price_impact_converted) * (1 - fee_converted_b));

        const trade_volume = Math.min(trade_volume_a, trade_volume_b);
        return trade_volume;
    }

    /**
     * Process transaction receipt for arbitrage opportunities
     * @param {ethers.TransactionReceipt | null} txReciept - Transaction receipt
     */
    async processTxReciept(txReciept) {
        if (txReciept === null) return;

        const to = txReciept.to;
        const txLogs = txReciept.logs;

        // Search for swap tx
        txLogs.forEach(async Log => {
            for (let topic of Log.topics) {

                // If transaction is a uniV2poolswap tx
                if (topic.toLowerCase() === v2PoolSwapSigBytes.toLowerCase()) {
                    try {
                        const poolAddr = Log.address;
                        const poolContract = func.uniV2Poolcontract(poolAddr, uniswapV2poolAbi, this.settings.provider);
                        const token01 = await Promise.all([
                            poolContract.token0(),
                            poolContract.token1()
                        ]);
                        const baseTokenWeth = func.isWethPair(ADDRESS.WETH, token01);
                        if (baseTokenWeth === "none") return;
                        this.findPoolInDex(baseTokenWeth, poolAddr, txReciept);
                    } catch (error) {
                        // Silent fail
                    }
                    break;
                }

                // If transaction is a uniV3poolswap tx
                if (topic.toLowerCase() === v3PoolSwapSigBytes.toLowerCase()) {
                    try {
                        const poolAddr = Log.address;
                        const poolContract = func.uniV2Poolcontract(poolAddr, uniswapV2poolAbi, this.settings.provider);
                        const token01 = await Promise.all([
                            poolContract.token0(),
                            poolContract.token1()
                        ]);
                        const baseTokenWeth = func.isWethPair(ADDRESS.WETH, token01);
                        if (baseTokenWeth === "none") return;
                        this.findPoolInDex(baseTokenWeth, poolAddr, txReciept);
                    } catch (error) {
                        // Silent fail
                    }
                    break;
                }
            }
        });
    }

    /**
     * Find pools in different DEXes for arbitrage
     * @param {any} tokenFind - Token to find (format sensitive [token, weth])
     * @param {string} motherPoolAddr - Original pool address
     * @param {ethers.TransactionReceipt} signalTx - Signal transaction
     */
    async findPoolInDex(tokenFind, motherPoolAddr, signalTx) {
        const dexFactory = [
            {factory: ADDRESS.PancakeV2Factory, version: 2},
            {factory: ADDRESS.PancakeV3Factory, version: 3},
            {factory: ADDRESS.sushiSwapV2Factory, version: 2},
            {factory: ADDRESS.sushiSwapV3Factory, version: 3},
            {factory: ADDRESS.uniswapv2Factory, version: 2},
            {factory: ADDRESS.uniswapv3Factory, version: 3},
            {factory: ADDRESS.baseSwapV2Factory, version: 2},
            {factory: ADDRESS.baseSwapV3Factory, version: 3},
            {factory: ADDRESS.swapBaseV2factory, version: 2},
            {factory: ADDRESS.swapBaseV3Factory, version: 3},
            {factory: ADDRESS.dackieV2Factory, version: 2},
            {factory: ADDRESS.dackieV3Factory, version: 3},
            {factory: ADDRESS.AlienbaseV2Factory, version: 2},
        ];

        // Call the getter contract to find the target token swapped in other dexes
        let [poolData, basetokenDecimal] = await this.getterContract().getPool(
            dexFactory,
            tokenFind,
            func.towei("1", 18)
        );
        const poolArray = poolData.filter((data) => data[0] != "0x0000000000000000000000000000000000000000");
        basetokenDecimal = Number(basetokenDecimal);

        if (poolArray.length < 2) return;

        // Get the mother pool from the returned poolArray
        let motherPoolArr = [];
        let ArbitragePoolArr = [];

        for (let i = 0; i < poolArray.length; i++) {
            if (poolArray[i].pool.toLowerCase() === motherPoolAddr.toLowerCase()) {
                motherPoolArr = poolArray[i];
            } else {
                ArbitragePoolArr.push(poolArray[i]);
            }
        }

        // Make sure the mother pool is found in the list pools of DEXes
        if (motherPoolArr.length === 0) return;

        // Calculate the prices of the motherpool
        const motherPoolPrice = Number(motherPoolArr[3]) === 2 ?
            this.calcPriceV2({weth: motherPoolArr[1], token: motherPoolArr[2]}, basetokenDecimal) :
            this.calcPriceV3(Number(motherPoolArr[5]), basetokenDecimal, motherPoolArr[6]);

        // Calculate the price of the other pools to arbitrage
        let ArbitragePoolPrices = [];
        for (let i = 0; i < ArbitragePoolArr.length; i++) {
            const wethLiq = ArbitragePoolArr[i][1];
            const tokenLiq = ArbitragePoolArr[i][2];
            const version = ArbitragePoolArr[i][3];
            const sqrtPriceX96 = ArbitragePoolArr[i][5];
            const tk0IsWeth = ArbitragePoolArr[i][6];

            const priceOfPool = Number(version) === 2 ?
                this.calcPriceV2({weth: wethLiq, token: tokenLiq}, basetokenDecimal) :
                this.calcPriceV3(Number(sqrtPriceX96), basetokenDecimal, tk0IsWeth);

            ArbitragePoolPrices[i] = priceOfPool;
        }

        // Find the highest and lowest price in ArbitragePoolPrices
        const HLprice = func.findHighestAndLowest(ArbitragePoolPrices);
        if (HLprice === null) return;

        const higherPrice = HLprice.highest.value;
        const higherPriceIndex = HLprice.highest.index;
        const lowerPrice = HLprice.lowest.value;
        const lowerPriceIndex = HLprice.lowest.index;

        // Find the lowest and highest of motherPoolPrice and the HLprice of the ArbitragePoolPrices
        const router = func.findHighestAndLowest([motherPoolPrice, higherPrice, lowerPrice]);
        const Lindex = router?.lowest.index;
        const Hindex = router?.highest.index;

        let buyLow = [];
        let buyPrice = 0;
        let sellHigh = [];
        let sellPrice = 0;

        if (Lindex === 0) {
            buyLow = motherPoolArr;
            buyPrice = motherPoolPrice;
        } else if (Lindex === 1) {
            buyLow = ArbitragePoolArr[higherPriceIndex];
            buyPrice = higherPrice;
        } else if (Lindex === 2) {
            buyLow = ArbitragePoolArr[lowerPriceIndex];
            buyPrice = lowerPrice;
        }

        if (Hindex === 0) {
            sellHigh = motherPoolArr;
            sellPrice = motherPoolPrice;
        } else if (Hindex === 1) {
            sellHigh = ArbitragePoolArr[higherPriceIndex];
            sellPrice = higherPrice;
        } else if (Hindex === 2) {
            sellHigh = ArbitragePoolArr[lowerPriceIndex];
            sellPrice = lowerPrice;
        }

        // Calculate the percentage of the price discrepencies
        const priceDiff = sellPrice - buyPrice;
        const priceDiffperc = Number(func.percent_of_x_in_y(priceDiff, sellPrice).toFixed(2));
        if (priceDiffperc < this.settings.minPriceDiffPerc) return;

        // Calculate optimal trade volume in WETH
        const buyLowFee = Number(buyLow[3]) === 3 ? Number(buyLow[4]) : 3000;
        const sellHighFee = Number(sellHigh[3]) === 3 ? Number(sellHigh[4]) : 3000;
        const amountInWETH = this.calc_trade_volume(buyLow[1], sellHigh[1], priceDiffperc, buyLowFee, sellHighFee);

        // TRADING LOGICS
        const ExtractIn = [
            {pool: buyLow[0], version: Number(buyLow[3])},
            {pool: sellHigh[0], version: Number(sellHigh[3])}
        ];

        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
            ['tuple(address pool, uint version)[]', 'address', 'uint'],
            [
                ExtractIn,
                tokenFind[0],
                func.towei(amountInWETH.toFixed(7), 18),
            ]
        );

        try {
            const txhash = await this.executeSwap().extract(encodedData, {
                value: 1
            });
            const tx = await txhash.wait();
            console.log(func.color.FgCyan + "Tx executed. Txhash:" + tx.hash + func.color.Reset);
        } catch (error) {
            console.log(func.color.FgRed + error.shortMessage + func.color.Reset);
        }
    }
}

module.exports = { Module };
