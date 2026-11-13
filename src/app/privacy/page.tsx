import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보 수집·이용" };

export default function Privacy() {
  return (
    <section className="view">
      <div className="panel stack" style={{ maxWidth: 760 }}>
        <h1 className="h2">개인정보 수집·이용 안내</h1>
        <p className="notice">데모 사이트예요. 실제 개인정보 대신 테스트용 정보를 입력해 주세요.</p>
        <dl className="kv wide">
          <dt>수집 항목</dt><dd>이메일, 이름, 연락처, 배송지, 반려동물 정보, 건강 기록</dd>
          <dt>이용 목적</dt><dd>회원 관리, 주문·배송, 정기배송 관리, 맞춤 상품 구성, 건강 기록 요약</dd>
          <dt>보유 기간</dt><dd>회원 탈퇴 시까지 (관련 법령에 따라 거래 기록은 5년 보관)</dd>
          <dt>결제 정보</dt><dd>카드 정보는 토스페이먼츠가 처리하며 이 사이트에 저장하지 않아요.</dd>
        </dl>
        <p>반려동물·건강 기록은 마이페이지에서 언제든 수정하거나 지울 수 있어요.</p>
      </div>
    </section>
  );
}
