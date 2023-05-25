import "@rainbow-me/rainbowkit/styles.css";
import {
  ConnectButton,
  getDefaultWallets,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import {
  configureChains,
  createClient,
  useBalance,
  useContract,
  useContractReads,
  useSigner,
  WagmiConfig,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { ethers } from "ethers";
import { useState } from "react";
import deploy from "./deploy";
import Escrow from "./Escrow";
import EscrowABI from "./artifacts/contracts/Escrow.sol/Escrow.json";

const { chains, provider } = configureChains(
  [sepolia],
  [
    jsonRpcProvider({
      rpc: () => ({
        http: process.env.REACT_APP_RPC_URL,
        webSocket: process.env.REACT_APP_WS_URL,
      }),
    }),
  ]
);

const { connectors } = getDefaultWallets({
  appName: "My RainbowKit App",
  projectId: "YOUR_PROJECT_ID",
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

export async function approve(escrowContract, signer) {
  const approveTxn = await escrowContract.connect(signer).approve();
  await approveTxn.wait();
}

function App() {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <Navbar />
        <MainPage />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

function Navbar() {
  return (
    <header className="flex justify-between max-w-4xl mx-auto p-2">
      <h1 className="text-2xl">Escrow App</h1>
      <ConnectButton />
    </header>
  );
}

function MainPage() {
  const [escrows, setEscrows] = useState([]);
  const [search, setSearch] = useState("");
  return (
    <main className="flex flex-col items-center gap-2 max-w-4xl mx-auto p-2">
      <SearchEscrow onSearch={setSearch} />
      <div className="w-full flex space-between gap-2">
        <EscrowForm setEscrows={setEscrows} />
        <EscrowList escrows={escrows} />
        {ethers.utils.isAddress(search) && <SearchedEscrow search={search} />}
      </div>
    </main>
  );
}

function EscrowForm({ setEscrows }) {
  const { data: signer } = useSigner();
  async function newContract() {
    const beneficiary = document.getElementById("beneficiary").value;
    const arbiter = document.getElementById("arbiter").value;
    const value = ethers.utils.parseEther(document.getElementById("wei").value);
    const escrowContract = await deploy(signer, arbiter, beneficiary, value);

    const escrow = {
      address: escrowContract.address,
      arbiter,
      beneficiary,
      value: value.toString(),
      handleApprove: async () => {
        escrowContract.on("Approved", () => {
          document.getElementById(escrowContract.address).className =
            "complete";
          document.getElementById(escrowContract.address).innerText =
            "✓ It's been approved!";
        });

        await approve(escrowContract, signer);
      },
    };

    setEscrows((escrows) => [...escrows, escrow]);
  }
  return (
    <div className="contract p-2 md:p-4 bg-white rounded-xl shadow-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          newContract();
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 className="title text-center mb-2">New Contract</h2>
          <label htmlFor="arbiter">Arbiter Address</label>
          <Input type="text" id="arbiter" />

          <label htmlFor="beneficiary">Beneficiary Address</label>
          <Input type="text" id="beneficiary" />

          <label htmlFor="wei">Deposit Amount</label>
          <Input type="text" id="wei" />

          <button className="button w-full mt-2" type="submit">
            Deploy
          </button>
        </div>
      </form>
    </div>
  );
}

function EscrowList({ escrows }) {
  return (
    <div className="flex-1 existing-contracts p-2 md:p-4 bg-white rounded-xl shadow-lg flex flex-col items-center">
      <h2 className="title text-center mb-2">Existing Contracts</h2>
      <div id="container">
        {escrows.map((escrow) => {
          return <Escrow key={escrow.address} {...escrow} />;
        })}
      </div>
    </div>
  );
}

function SearchEscrow({ onSearch, ...props }) {
  return (
    <div className="w-full p-2 md:p-4 bg-white rounded-xl shadow-lg flex items-baseline gap-2">
      <Input {...props} placeholder="Enter a 0x address to search for a deployed Escrow" type="text" id="search" className="input mb-0" />
      <button
        className="button"
        onClick={(e) => {
          e.preventDefault();
          onSearch(document.getElementById("search").value);
        }}
      >
        Search
      </button>
    </div>
  );
}

function SearchedEscrow({ search }) {
  const contract = {
    address: search,
    abi: EscrowABI.abi,
  };
  const { data: balance } = useBalance({
    address: search,
  });
  const { data: contractData } = useContractReads({
    contracts: [
      {
        ...contract,
        functionName: "arbiter",
      },
      {
        ...contract,
        functionName: "beneficiary",
      },
      {
        ...contract,
        functionName: "isApproved",
      },
    ],
  });
  const { data: signer } = useSigner();
  const escrowContract = useContract({
    ...contract,
    signerOrProvider: signer,
  });
  const escrow = contractData
    ? {
        address: search,
        arbiter: contractData[0],
        beneficiary: contractData[1],
        isApproved: contractData[2],
        value: balance.value.toString(),
        handleApprove: async () => {
          escrowContract.on("Approved", () => {
            document.getElementById(escrowContract.address).className =
              "complete";
            document.getElementById(escrowContract.address).innerText =
              "✓ It's been approved!";
          });

          await approve(escrowContract, signer);
        },
      }
    : undefined;
  return (
    <div className="existing-contracts p-2 bg-white rounded-xl shadow-lg flex flex-col items-center">
      <h2 className="title">Searched Escrow</h2>
      {escrow && <Escrow key={escrow.address} {...escrow} />}
    </div>
  );
}

function Input(props) {
  return <input className="input" {...props} />;
}

export default App;
