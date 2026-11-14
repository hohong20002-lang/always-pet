"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";

type P = { name: string; phone: string; zipcode: string; address: string; address_detail: string; marketing_opt_in: boolean };

export default function ProfileForm({ email, initial }: { email: string; initial: P }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="form">
      <label>이메일<input type="email" value={email} disabled /></label>
      <div className="two">
        <label>이름<input type="text" name="name" defaultValue={initial.name} maxLength={40} /></label>
        <label>연락처<input type="tel" name="phone" defaultValue={initial.phone} maxLength={20} placeholder="010-0000-0000" /></label>
      </div>
      <label><span className="lbl">우편번호<small>(선택사항)</small></span><input type="text" name="zipcode" defaultValue={initial.zipcode} maxLength={10} inputMode="numeric" /></label>
      <label>기본 배송지<input type="text" name="address" defaultValue={initial.address} maxLength={200} /></label>
      <label>상세 주소<input type="text" name="address_detail" defaultValue={initial.address_detail} maxLength={200} /></label>
      <label style={{ flexDirection: "row", alignItems: "center", fontWeight: 400, gap: 8 }}>
        <input type="checkbox" name="marketing_opt_in" defaultChecked={initial.marketing_opt_in} /> 새 상품·혜택 소식 받기 (선택사항)
      </label>
      {state?.error && <p className="err">{state.error}</p>}
      {state?.ok && <p className="ok-msg">{state.ok}</p>}
      <button className="btn" disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
    </form>
  );
}
