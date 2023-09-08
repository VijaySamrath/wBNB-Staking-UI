import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import contractAbi from "./contractABI.json";
import stakingTokenAbi from "./stakingTokenABI.json";
// import "bootstrap/dist/css/bootstrap.min.css";
import './App.css'

function calculateAPR(totalRewards, totalValueStaked, durationInDays) {
  const apr = (totalRewards / totalValueStaked) * (365 / durationInDays) * 100;
  return apr.toFixed(2); // Rounded to two decimal places
}

function App() {
  const stakingContractAddress = '0x550d3a43D5CB57E70dD1F53699CEaA0f371ADbBb';
  const stakingTokenAddress = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';

  const [uploadedImages, setUploadedImages] = useState([]);

  let [blockchainProvider, setBlockchainProvider] = useState(undefined);
  let [metamask, setMetamask] = useState(undefined);
  let [metamaskNetwork, setMetamaskNetwork] = useState(undefined);
  let [metamaskSigner, setMetamaskSigner] = useState(undefined);
  const [networkId, setNetworkId] = useState(undefined);
  const [loggedInAccount, setAccounts] = useState(undefined);
  const [etherBalance, setEtherBalance] = useState(undefined);
  const [isError, setError] = useState(false);

  const [stakingContract, setReadStakingContract ] = useState(null);
  const [writeStakingContract, setWriteStakingContract] = useState(null);
  const [ApprovalStakingToken, setApproveStakingToken] = useState(null);

  const [provider, setProvider] = useState();
  const [contract, setContract] = useState();
  const [balance, setBalance] = useState(0);
  const [apr, setApr] = useState(0);
  const [stakeAmount, setStakeAmount] = useState();
  const [unstakeAmount, setUnstakeAmount] = useState();

  const connect = async () => {
    try {
      let provider, network, metamaskProvider, signer, accounts;

      if (typeof window.ethereum !== "undefined") {
        // Connect to RPC
        console.log("loadNetwork");
        try {
          accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          await handleAccountsChanged(accounts);
        } catch (err) {
          if (err.code === 4001) {
            console.log("Please connect to MetaMask.");
          } else {
            console.error(err);
          }
        }
        provider = new ethers.providers.JsonRpcProvider(
          `https://bsc-testnet.publicnode.com`
        );
        setBlockchainProvider(provider);
        network = await provider.getNetwork();
        console.log(network.chainId);
        setNetworkId(network.chainId);

        // Connect to Metamask
        metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
        setMetamask(metamaskProvider);

        const signer = await metamaskProvider.getSigner(accounts[0]);
        setMetamaskSigner(signer);

        metamaskNetwork = await metamaskProvider.getNetwork();
        setMetamaskNetwork(metamaskNetwork.chainId);

        console.log(network);

        if (network.chainId !== metamaskNetwork.chainId) {
          alert("Your Metamask wallet is not connected to " + network.name);

          setError("Metamask not connected to RPC network");
        }

        let tempStakingContract = new ethers.Contract(
          stakingContractAddress,
          contractAbi,
          provider
        );
        setReadStakingContract(tempStakingContract); //stakingContract
        let tempStakingContract2 = new ethers.Contract(
          stakingContractAddress,
          contractAbi,
          signer
        );
        setWriteStakingContract(tempStakingContract2); //writeContract

        let tempStakingContract3 = new ethers.Contract(
          stakingTokenAddress,
          stakingTokenAbi,
          provider
        );
        setApproveStakingToken(tempStakingContract3); //ApprovestakingToken

        let tempStakingContract4 = new ethers.Contract(
          stakingTokenAddress,
          stakingTokenAbi,
          signer
        );
        setApproveStakingToken(tempStakingContract4);//writeApprovestakingToken

      } else setError("Could not connect to any blockchain!!");

      return {
        provider,
        metamaskProvider,
        signer,
        network: network.chainId,
      };
    } catch (e) {
      console.error(e);
      setError(e);
    }
  };

  const handleAccountsChanged = async (accounts) => {
    if (typeof accounts !== "string" || accounts.length < 1) {
      accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
    }
    console.log("t1", accounts);
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      alert("Please connect to MetaMask.");
    } else if (accounts[0] !== loggedInAccount) {
      setAccounts(accounts[0]);
    }
    
  };

  useEffect(() => {
    const init = async () => {
      const { provider, metamaskProvider, signer, network } = await connect();

      const accounts = await metamaskProvider.listAccounts();
      console.log(accounts[0]);
      setAccounts(accounts[0]);

      if (typeof accounts[0] == "string") {
        setEtherBalance(
          ethers.utils.formatEther(
            Number(await metamaskProvider.getBalance(accounts[0])).toString()
          )
        );
      }
    };

    init();

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    window.ethereum.on("chainChanged", function (networkId) {
      //Time to reload your interface with the new networkId
      //window.location.reload();
      unsetStates();
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (
        typeof metamask == "object" &&
        typeof metamask.getBalance == "function" &&
        typeof loggedInAccount == "string"
      ) {
        setEtherBalance(
          ethers.utils.formatEther(
            Number(await metamask.getBalance(loggedInAccount)).toString()
          )
        );
      }
    })();
  }, [loggedInAccount]);

  const unsetStates = useCallback(() => {
    setBlockchainProvider(undefined);
    setMetamask(undefined);
    setMetamaskNetwork(undefined);
    setMetamaskSigner(undefined);
    setNetworkId(undefined);
    setAccounts(undefined);
    setEtherBalance(undefined);
  }, []);

  const isReady = useCallback(() => {
    return (
      typeof blockchainProvider !== "undefined" &&
      typeof metamask !== "undefined" &&
      typeof metamaskNetwork !== "undefined" &&
      typeof metamaskSigner !== "undefined" &&
      typeof networkId !== "undefined" &&
      typeof loggedInAccount !== "undefined"
    );
  }, [
    blockchainProvider,
    metamask,
    metamaskNetwork,
    metamaskSigner,
    networkId,
    loggedInAccount,
  ]);

  async function fetchBalance() {
      console.log("I am user", metamaskSigner);
      const balance = await stakingContract.userInfo(metamaskSigner);
      return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimal places
  }

  async function stake() {
        console.log(stakeAmount); 
        console.log(String(ethers.utils.parseEther(stakeAmount)));
        const tx = await ApprovalStakingToken.approve(stakingContractAddress, String(ethers.utils.parseEther(stakeAmount)))
        await tx.wait();

      const tx2 = await writeStakingContract.deposit(String(ethers.utils.parseEther(stakeAmount)));
      await tx2.wait();
      setStakeAmount(tx2);

      // Refresh balance after staking
      const balance = await fetchBalance();
      setBalance(balance);

      // Calculate APR directly based on your contract's data
      const totalRewards = await stakingContract.accTokenPerShare();
      const totalValueStaked = await stakingContract.userInfo(metamaskSigner);
      const durationInDays = await stakingContract.lastRewardTimestamp();
      const calculatedAPR = calculateAPR(totalRewards, totalValueStaked, durationInDays);
      setApr(calculatedAPR);
  }

    
  async function unstake() {
  
      const tx = await writeStakingContract.withdraw(ethers.utils.parseEther(unstakeAmount));
      await tx.wait();
      setUnstakeAmount(tx);
      // Refresh balance after unstaking
      const balance = await fetchBalance();
      setBalance(balance);

      // Calculate APR directly based on your contract's data
      const totalRewards = await contract.totalRewards();
      const totalValueStaked = await contract.totalValueStaked();
      const durationInDays = await contract.durationInDays();
      const calculatedAPR = calculateAPR(totalRewards, totalValueStaked, durationInDays);
      setApr(calculatedAPR);
    }


//   style={{background:"black"}}
return (
  <div className="App">
    <h1>WBNB Staking</h1>
    <p>APR: {apr}%</p>
    <p>Balance: {balance} BNB</p>
    <div>
      <input
        type="text"
        placeholder="Stake Amount"
        value={stakeAmount}
        onChange={(e) => setStakeAmount(e.target.value)}
      />
      <button onClick={stake}>Stake</button>
    </div>
    <div>
      <input
        type="text"
        placeholder="Unstake Amount"
        value={unstakeAmount}
        onChange={(e) => setUnstakeAmount(e.target.value)}
      />
      <button onClick={unstake}>Unstake</button>
    </div>
  </div>
);
}

export default App;
