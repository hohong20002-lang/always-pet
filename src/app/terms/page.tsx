import type { Metadata } from "next";

export const metadata: Metadata = { title: "이용약관" };

export default function Terms() {
  return (
    <section className="view">
      <div className="panel stack" style={{ maxWidth: 760 }}>
        <h1 className="h2">이용약관</h1>
        <p className="notice">이 사이트는 전자상거래 팀 프로젝트의 데모 쇼핑몰이에요. 실제 상품 판매·배송은 이뤄지지 않고, 결제는 토스페이먼츠 테스트 환경으로만 처리돼요.</p>
        <h2 className="h2" style={{ fontSize: 18 }}>제1조 (목적)</h2>
        <p>이 약관은 올웨이즈 펫(이하 “서비스”)이 제공하는 노령 반려동물 케어 커머스 서비스의 이용 조건과 절차를 정합니다.</p>
        <h2 className="h2" style={{ fontSize: 18 }}>제2조 (정기배송)</h2>
        <p>정기배송은 첫 회차를 주문할 때 결제하며, 회원은 마이페이지에서 언제든 배송일 변경·건너뛰기·일시정지·해지를 할 수 있습니다. 해지에 따른 위약금은 없습니다.</p>
        <h2 className="h2" style={{ fontSize: 18 }}>제3조 (주문 취소)</h2>
        <p>상품 준비가 시작되기 전(결제 완료 상태)에는 회원이 직접 주문을 취소할 수 있으며, 결제 금액은 결제 수단으로 환불됩니다.</p>
        <h2 className="h2" style={{ fontSize: 18 }}>제4조 (건강 기록)</h2>
        <p>건강 기록의 주간 요약과 상담 리포트는 보호자가 입력한 내용을 정리한 것이며 수의학적 진단을 대신하지 않습니다.</p>
      </div>
    </section>
  );
}
