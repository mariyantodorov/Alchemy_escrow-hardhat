import { ethers } from "ethers";

export default function Escrow({
  address,
  arbiter,
  beneficiary,
  value,
  handleApprove,
}) {
  return (
    <div className="existing-contract">
      <ul className="fields">
        <li>
          <div>Arbiter</div>
          <div>
            {arbiter.slice(0, 6)}...
            {arbiter.slice(arbiter.length - 4, arbiter.length)}
          </div>
        </li>
        <li>
          <div>Beneficiary</div>
          <div>
            {beneficiary.slice(0, 6)}...
            {beneficiary.slice(beneficiary.length - 4, beneficiary.length)}
          </div>
        </li>
        <li>
          <div>Value</div>
          <div>{ethers.utils.formatEther(value)}</div>
        </li>
        <button
          className="button"
          id={address}
          onClick={(e) => {
            e.preventDefault();

            handleApprove();
          }}
        >
          Approve
        </button>
      </ul>
    </div>
  );
}
