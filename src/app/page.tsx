import Link from "next/link";
import { CONCERNS } from "@/lib/shop";

export default function Home() {
  return (
    <section className="view">
      <div className="hero">
        <div className="stack">
          <span className="eyebrow">노령 반려동물 케어 커머스</span>
          <h1>
            늘 곁에,
            <br />더 오래 건강하게
          </h1>
          <p className="lead">고르고, 기록하고, 조정하는 일을 한곳에서. 일곱 살이 넘은 아이에게 맞는 돌봄을 매일 실천하기 쉽게 만들었어요.</p>
          <div className="cta">
            <Link className="btn" href="/box">우리 아이 케어 박스 만들기</Link>
            <Link className="btn ghost" href="/record">1분 기록 해보기</Link>
          </div>
        </div>
        <div className="ph">
          <img src="/img/walk.jpg" alt="올웨이즈 펫 하네스를 착용하고 산책하는 골든 리트리버" />
        </div>
      </div>

      <div className="concern">
        <h2>요즘 어떤 변화가 보이나요?</h2>
        <p className="lead">상품 종류가 아니라 아이의 변화로 찾아보세요. 고르면 관련 상품과 추천 이유를 함께 보여드려요.</p>
        <div className="row">
          {CONCERNS.map((c) => (
            <Link key={c.id} className="chip" href={`/shop?concern=${c.id}`} style={{ textDecoration: "none" }}>
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="band">
        <img src="/img/box.jpg" alt="올웨이즈 펫 시니어 케어 박스 구성품" />
        <div className="txt">
          <span className="eyebrow" style={{ color: "var(--bg)", opacity: 0.8 }}>매달 받는 핵심 상품</span>
          <h2>시니어 맞춤 케어 박스</h2>
          <p className="lead">질문 4개면 구성이 끝나요. 왜 이 구성인지도 함께 알려드려요.</p>
          <ul>
            <li>기본 월 29,900원 · 프리미엄 월 39,900원</li>
            <li>남은 양에 맞춰 배송일 변경</li>
            <li>건너뛰기·해지 위약금 없음</li>
          </ul>
          <Link className="btn" href="/box">구성 시작하기</Link>
        </div>
      </div>

      <div className="flow">
        <h2 className="h2">구매 뒤에도 이어지는 돌봄</h2>
        <ol>
          <li><b>탐색</b><span>아이의 변화로 상품을 찾고 추천 이유를 확인해요.</span></li>
          <li><b>구매</b><span>짧은 질문과 소량 체험으로 부담 없이 시작해요.</span></li>
          <li><b>관리</b><span>식사·활동·배변을 탭 몇 번으로 기록해요.</span></li>
          <li><b>조정</b><span>상담 리포트를 만들고 배송을 소비 속도에 맞춰요.</span></li>
        </ol>
      </div>

      <div className="split">
        <div className="ph">
          <img src="/img/app.jpg" alt="보호자가 휴대폰으로 반려견의 건강 기록을 확인하는 모습" />
        </div>
        <div className="stack">
          <span className="eyebrow">건강 기록 · 주간 요약</span>
          <h2 className="h2">
            진단하지 않아요.
            <br />
            변화를 놓치지 않게 정리해요.
          </h2>
          <p className="lead">하루 1분, 버튼 몇 개로 남긴 기록을 주간 단위로 요약하고 병원에서 물어볼 질문을 정리해 드려요.</p>
          <div>
            <Link className="btn ghost" href="/record">이번 주 요약 보기</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
