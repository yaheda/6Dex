import Web3 from 'web3';
import Dex from './contracts/Dex.json';
import ERC20Abi from './ERC20Abi.json';

import detectEthereumProvider from '@metamask/detect-provider'

const getWeb3 = () => {
  return new Promise((resolve, reject) => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
    window.addEventListener("load", async () => {
      let provider = await detectEthereumProvider();

      if (provider) {
        await provider.request({ method: 'eth_requestAccounts' });

        try {
          const web3 = new Web3(window.ethereum);
          resolve(web3);
        } catch (error) {
          reject(error);
        }
      }

      // else {
      //   const provider = new Web3.providers.HttpProvider(
      //     "http://localhost:9545"
      //   );
      //   const web3 = new Web3(provider);
      //   console.log("No web3 instance injected, using Local web3.");
      //   resolve(web3);
      // }

      reject('Must install Metamask');
    });
  });
};

const getContracts = async web3 => {
  const networkId = await web3.eth.net.getId();
  const deployedNetwork = Dex.networks[networkId];
  const dex = new web3.eth.Contract(
    Dex.abi,
    deployedNetwork && deployedNetwork.address,
  );
  const tokens = await dex.methods.getTokens().call();

  // Build object with ticker of token as key
  // {
  //   //ticker of tocken => contract instance
  //   0x76934342: contractInstance
  // }

  const tokenContracts = tokens.reduce((acc, token) => ({
    ...acc,
    [web3.utils.hexToUtf8(token.ticker)]: new web3.eth.Contract(
      ERC20Abi,
      token.tokenAddress
    )
  }), {});
  return { dex, ...tokenContracts };

  /// { dex, BAT, REP}
}

export { getWeb3, getContracts }