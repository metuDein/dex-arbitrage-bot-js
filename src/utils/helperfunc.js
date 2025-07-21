const { ethers } = require("ethers");
const fs = require("fs");
const winston = require('winston');
const yaml = require("js-yaml");

/**
 * Check if a value contains only alphabetic characters
 * @param {any} value - Value to check
 * @returns {boolean} True if alphabetic, false otherwise
 */
function isAlphabetic(value) {
  return typeof value === 'string' && /^[A-Za-z ]+$/.test(value);
}

/**
 * Check if WETH is included in pair and return the proper order
 * @param {string} WETH - WETH contract address
 * @param {string[]} token01 - Array of two token addresses
 * @returns {[string, string] | string} Returns [token, weth] array or "none"
 */
const isWethPair = (WETH, token01) => {
    // If WETH addr is in token0 return token1 verse versa else return none
    if (token01[0].toLowerCase() === WETH.toLowerCase()) {
        return [token01[1], token01[0]];
    }
    else if (token01[1].toLowerCase() === WETH.toLowerCase()) {
        return [token01[0], token01[1]];
    }

    return "none";
};

const erc20ABI = [
    "function decimals() external view returns (uint8)",
    "function approve(address spender, uint256 value) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function withdraw(uint wad) public",
    "function deposit() public payable"
];

const ERC20contract = (addr, provider) => new ethers.Contract(addr, erc20ABI, provider);
const uniV2Poolcontract = (addr, abi, provider) => new ethers.Contract(addr, abi, provider);

const x_percent_of_y = (x, y) => (x / 100) * y;
const percent_of_x_in_y = (x, y) => (x / y) * 100;

/**
 * Convert human readable amount to wei
 * @param {string} amount - Amount to convert
 * @param {number} decimals - Token decimals
 * @returns {string} Wei amount as string
 */
const towei = (amount, decimals) =>
  ethers.parseUnits(amount, decimals).toString();

/**
 * Convert from wei to human readable amount
 * @param {string} amount - Wei amount
 * @param {number} decimals - Token decimals
 * @returns {string} Human readable amount
 */
const fromwei = (amount, decimals) =>
  ethers.formatUnits(amount, decimals).toString();

/**
 * Load YAML file and parse it
 * @param {string} fpath - File path
 * @returns {any} Parsed YAML content
 */
function loadYaml(fpath) {
    const fileContents = fs.readFileSync(fpath, "utf8");
    const config = yaml.load(fileContents);
    return config;
}

/**
 * Create a Winston logger
 * @param {string|undefined} logtopath - Optional log file path
 * @returns {winston.Logger} Winston logger instance
 */
const logger = (logtopath = undefined) => winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.combine()
  ),
  transports: logtopath ?
    [new winston.transports.File({ filename: logtopath })] :
    [new winston.transports.Console()]
});

/**
 * Find highest and lowest values in an array with their indices
 * @param {number[]} arr - Array of numbers
 * @returns {{highest: {value: number, index: number}, lowest: {value: number, index: number}} | null}
 */
function findHighestAndLowest(arr) {
  if (arr.length === 0) {
      return null;
  }

  let highest = arr[0];
  let highestIndex = 0;
  let lowest = arr[0];
  let lowestIndex = 0;

  for (let index = 1; index < arr.length; index++) {
      const value = arr[index];
      if (value > highest) {
          highest = value;
          highestIndex = index;
      }
      if (value < lowest) {
          lowest = value;
          lowestIndex = index;
      }
  }

  return {
      highest: { value: highest, index: highestIndex },
      lowest: { value: lowest, index: lowestIndex }
  };
}

const color = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",

  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
};

module.exports = {
  isAlphabetic,
  isWethPair,
  erc20ABI,
  ERC20contract,
  uniV2Poolcontract,
  x_percent_of_y,
  percent_of_x_in_y,
  towei,
  fromwei,
  loadYaml,
  logger,
  findHighestAndLowest,
  color
};
