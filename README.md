# DEX Arbitrage Bot - JavaScript Version

The DEX Arbitrage Bot is an automated trading bot designed to execute arbitrage strategies on decentralized exchanges (DEXs). It leverages blockchain technology to detect price discrepancies between different tokens in different DEXs, allowing users to profit by buying low on one exchange and selling high on another.

**Note: This is a JavaScript conversion of the original TypeScript project for easier deployment and execution.**

# Features
•	Automated Arbitrage Execution: The bot identifies arbitrage opportunities between different pairs of tokens across DEXs automatically.

•	Blockchain Integration: Built on top of blockchain smart contracts, ensuring transparency and security.

•	Fast Execution: Optimized for speed to minimize missed opportunities.

•	Configurable Settings: User-configurable parameters such as minimum price discrepency tolerance.


# Prerequisites

To run the Base Arbitrage Bot, ensure you have the following installed:

1.	Node.js (v14 or later) or Docker
2.	NPM (for node.js only)
3.	A Web3 wallet (e.g., MetaMask) or access to a Web3 wallet.
4.	Sufficient cryptocurrency balance ETH to cover gas fees and WETH to perform transactions.

# Installation

Tutorial Videos:
Part1 - https://youtu.be/j1HwQIAzFdQ?si=NYYKXPZcLuoqHhHF
Part2 - https://youtu.be/ZQL5wvImFKI?si=6HwF7DJlQqPg0gWx
Part3 - https://youtu.be/WRLYNIROD9w?si=wG3qbBQN19rt89lv

Follow the steps below to clone and install the bot on your local machine:

1. Clone the repository:

        git clone https://github.com/Fluronix/base-arbitrage-bot.git
        cd base-arbitrage-bot

# Running using Docker

* Edit the ./src/.env file with your preference and wallet private key or seedphrase. Note the websocket rpc url "ws://base.node.fluronix.app:8546/" might not be active in the future.

* Build to a docker image

      docker build -t dex-arbitrage-bot-js .
* Run bot

      docker run --env-file ./src/.env dex-arbitrage-bot-js
* Stop bot

        docker stop dex-arbitrage-bot-js

Enjoy!

# Running using Node.js

* Install dependencies:

         npm install

* Edit the ./src/.env file with your preference and wallet private key or seedphrase. Note the websocket rpc url "ws://base.node.fluronix.app:8546/" might not be active in the future.

* Run the bot:

         npm start

   Or alternatively:

         node src/main.js

Enjoy!
# dex_arb_searcher_v2
# dex_arb_searcher_v2
