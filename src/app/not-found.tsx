import Link from "next/link";

export default function NotFound() {
  return (
    <section className="view">
      <div className="empty">
        <h1 className="h2">페이지를 찾을 수 없어요</h1>
        <p style={{ margin: "10px 0 18px" }}>주소가 바뀌었거나 없는 페이지예요.</p>
        <Link className="btn" href="/">홈으로</Link>
      </div>
    </section>
  );
}
