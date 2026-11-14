import "server-only";
import { loginEventsCol, visitsCol, type LoginKind } from "@/lib/activity";
import { cols } from "@/lib/models";
import { addDays, fmtDateTime, todayKST } from "@/lib/shop";

// 관리자 전용 탭: 방문 현황 / 회원·로그인 기록
// 이 파일의 컴포넌트는 관리자 확인을 마친 admin/page.tsx 안에서만 렌더링돼요.

/** 지금부터 ms 전 시각 (화면을 그리는 함수 밖에서 현재 시각을 계산) */
const ago = (ms: number) => new Date(Date.now() - ms);

const KIND_LABEL: Record<LoginKind, string> = {
  login: "로그인",
  login_failed: "로그인 실패",
  signup: "회원가입",
  logout: "로그아웃",
};

export async function VisitsTab() {
  const visits = await visitsCol();
  const today = todayKST();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
  const from7 = addDays(today, -6);

  const [daily, total7, topPages] = await Promise.all([
    visits
      .aggregate<{ _id: string; views: number; visitors: string[]; members: (string | null)[] }>([
        { $match: { day: { $gte: days[days.length - 1] } } },
        { $group: { _id: "$day", views: { $sum: 1 }, visitors: { $addToSet: "$vid" }, members: { $addToSet: "$user_id" } } },
      ])
      .toArray(),
    visits.aggregate<{ n: number }>([{ $match: { day: { $gte: from7 } } }, { $group: { _id: "$vid" } }, { $count: "n" }]).toArray(),
    visits
      .aggregate<{ _id: string; views: number }>([
        { $match: { day: { $gte: from7 } } },
        { $group: { _id: "$path", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ])
      .toArray(),
  ]);
  const byDay = new Map(daily.map((d) => [d._id, d]));
  const t = byDay.get(today);
  const memberCount = (d?: { members: (string | null)[] }) => (d ? d.members.filter(Boolean).length : 0);
  const maxVisitors = Math.max(1, ...days.map((d) => byDay.get(d)?.visitors.length ?? 0));

  return (
    <div className="stack">
      <div className="stats">
        <div className="panel"><b className="num">{t?.visitors.length ?? 0}명</b><span>오늘 방문자</span></div>
        <div className="panel"><b className="num">{t?.views ?? 0}회</b><span>오늘 페이지 조회</span></div>
        <div className="panel"><b className="num">{memberCount(t)}명</b><span>오늘 방문한 회원</span></div>
        <div className="panel"><b className="num">{total7[0]?.n ?? 0}명</b><span>최근 7일 방문자</span></div>
      </div>
      <div className="tablewrap">
        <table className="t">
          <thead><tr><th>날짜</th><th>방문자</th><th>페이지 조회</th><th>방문한 회원</th><th style={{ width: "40%" }}>방문자 추이</th></tr></thead>
          <tbody>
            {days.map((d) => {
              const row = byDay.get(d);
              const v = row?.visitors.length ?? 0;
              return (
                <tr key={d}>
                  <td className="num">{d === today ? "오늘" : d.slice(5).replace("-", "/")}</td>
                  <td className="num">{v}명</td>
                  <td className="num">{row?.views ?? 0}회</td>
                  <td className="num">{memberCount(row)}명</td>
                  <td><div className="bar-h"><i style={{ width: `${(v / maxVisitors) * 100}%` }} /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="tablewrap">
        <table className="t">
          <thead><tr><th>최근 7일 많이 본 화면</th><th>조회 수</th></tr></thead>
          <tbody>
            {topPages.map((p) => (
              <tr key={p._id}><td className="num">{p._id}</td><td className="num">{p.views}회</td></tr>
            ))}
            {!topPages.length && <tr><td colSpan={2} style={{ textAlign: "center", color: "var(--muted)" }}>아직 방문 기록이 없어요.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="disclaim">방문자는 브라우저마다 붙는 무작위 번호로 세요. 같은 사람이라도 다른 기기·브라우저로 들어오면 따로 세지고, 같은 화면을 30초 안에 다시 열면 한 번으로 세요. 방문 기록은 90일 뒤 자동으로 지워져요.</p>
    </div>
  );
}

export async function MembersTab({ admins }: { admins: string[] }) {
  const { users, orders } = await cols();
  const events = await loginEventsCol();
  const [members, lastLogins, orderCounts, recent] = await Promise.all([
    users.find({}, { projection: { email: 1, name: 1, created_at: 1 } }).sort({ created_at: -1 }).limit(500).toArray(),
    events.aggregate<{ _id: string; at: Date }>([
      { $match: { kind: "login", user_id: { $ne: null } } },
      { $group: { _id: "$user_id", at: { $max: "$at" } } },
    ]).toArray(),
    orders.aggregate<{ _id: string; n: number }>([
      { $match: { status: { $in: ["paid", "preparing", "shipped", "delivered"] } } },
      { $group: { _id: "$user_id", n: { $sum: 1 } } },
    ]).toArray(),
    events.find({}).sort({ at: -1 }).limit(100).toArray(),
  ]);
  const lastLogin = new Map(lastLogins.map((l) => [l._id, l.at]));
  const orderCount = new Map(orderCounts.map((o) => [o._id, o.n]));
  const dayAgo = ago(86400_000);
  const weekAgo = ago(7 * 86400_000);
  const failed24h = recent.filter((e) => e.kind === "login_failed" && e.at > dayAgo).length;
  const newMembers7d = members.filter((m) => m.created_at > weekAgo).length;

  return (
    <div className="stack">
      <div className="stats">
        <div className="panel"><b className="num">{members.length}명</b><span>전체 회원</span></div>
        <div className="panel"><b className="num">{newMembers7d}명</b><span>최근 7일 신규 가입</span></div>
        <div className="panel"><b className="num">{failed24h}회</b><span>최근 24시간 로그인 실패</span></div>
      </div>

      <h2 className="h2" style={{ fontSize: 19 }}>회원 목록</h2>
      <div className="tablewrap">
        <table className="t">
          <thead><tr><th>가입일</th><th>아이디(이메일)</th><th>이름</th><th>마지막 로그인</th><th>주문</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m._id}>
                <td className="num">{fmtDateTime(m.created_at)}</td>
                <td>{m.email}{admins.includes(m.email) && <span className="tag green" style={{ marginLeft: 6 }}>관리자</span>}</td>
                <td>{m.name || "-"}</td>
                <td className="num">{lastLogin.get(m._id) ? fmtDateTime(lastLogin.get(m._id)!) : "-"}</td>
                <td className="num">{orderCount.get(m._id) ?? 0}건</td>
              </tr>
            ))}
            {!members.length && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>아직 회원이 없어요.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="h2" style={{ fontSize: 19, marginTop: 8 }}>로그인 기록 <small style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--f-body)" }}>최근 100건</small></h2>
      <div className="tablewrap">
        <table className="t">
          <thead><tr><th>시각</th><th>종류</th><th>아이디(이메일)</th><th>기기</th><th>IP(일부)</th></tr></thead>
          <tbody>
            {recent.map((e) => (
              <tr key={e._id}>
                <td className="num">{fmtDateTime(e.at)}</td>
                <td><span className={`status ${e.kind === "login_failed" ? "shipped" : e.kind === "logout" ? "cancelled" : ""}`}>{KIND_LABEL[e.kind]}</span></td>
                <td>{e.email}</td>
                <td>{e.device} · {e.browser}</td>
                <td className="num">{e.ip}</td>
              </tr>
            ))}
            {!recent.length && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>아직 로그인 기록이 없어요. 이 기능을 추가한 뒤부터 쌓여요.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="disclaim">로그인 실패 기록의 이메일은 입력한 그대로 남아요(가입하지 않은 이메일일 수도 있어요). IP는 앞 두 자리만 보관하고, 로그인 기록은 180일 뒤 자동으로 지워져요.</p>
    </div>
  );
}
