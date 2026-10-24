"use client";

import styles from "./AddressForm.module.css";

type AddressFormProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function AddressForm({
  value,
  disabled = false,
  onChange,
  onSubmit,
}: AddressFormProps) {
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className={styles.label} htmlFor="wallet-address">
        Ethereum address
      </label>
      <div className={styles.row}>
        <input
          id="wallet-address"
          className={styles.input}
          type="text"
          name="address"
          value={value}
          disabled={disabled}
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className={styles.button} type="submit" disabled={disabled}>
          {disabled ? "Loading…" : "View NFTs"}
        </button>
      </div>
    </form>
  );
}
