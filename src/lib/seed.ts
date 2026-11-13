import type { Product } from "./shop";

// 처음 DB에 연결할 때 자동으로 등록되는 상품 (프로토타입 데이터 그대로)
export const SEED_PRODUCTS: Product[] = [
  {
    id: "carebox", category: "box", name: "시니어 맞춤 케어 박스", image: "box.jpg", price: 29900, trial_price: null, subscribable: true,
    description: "아이의 나이·체중·관심사에 맞춰 간식, 영양 보조 제품, 케어 안내서를 매달 구성해 보내드려요.",
    spec: {}, concerns: ["joint", "appetite", "digest", "skin"], main_ingredients: [],
    why: { joint: "관절 케어 구성 선택 가능", appetite: "기호성 높은 소포장 간식 포함", digest: "소화가 편한 간식으로 구성", skin: "저자극 위생용품 포함 (프리미엄)" },
    stock: 100, active: true, sort: 0,
  },
  {
    id: "jerky", category: "treat", name: "닭가슴살 육포", image: "treats.jpg", price: 8900, trial_price: 3900, subscribable: true,
    description: "얇게 펴서 말려 이가 약한 아이도 잘게 찢어 먹일 수 있어요. 국내산 닭가슴살 단일 원료.",
    spec: { 주원료: "닭가슴살 100%", 중량: "80g", 급여: "체중 5kg 기준 하루 2~3조각", 식감: "얇고 부드러움" },
    concerns: ["appetite"], main_ingredients: ["닭고기"], why: { appetite: "단일 원료라 기호 확인이 쉬워요" },
    stock: 100, active: true, sort: 1,
  },
  {
    id: "salmon", category: "treat", name: "연어 스틱", image: "treats.jpg", price: 9900, trial_price: 3900, subscribable: true,
    description: "연어를 부드러운 스틱으로 만들었어요. 손으로 쉽게 잘라 양 조절이 편해요.",
    spec: { 주원료: "연어 92%, 고구마 전분", 중량: "70g", 급여: "체중 5kg 기준 하루 1~2개", 식감: "말랑함" },
    concerns: ["appetite", "skin"], main_ingredients: ["연어"],
    why: { appetite: "향이 강해 식욕이 떨어진 아이에게 시도해 보기 좋아요", skin: "오메가-3 함유 원료(연어)" },
    stock: 100, active: true, sort: 2,
  },
  {
    id: "potato", category: "treat", name: "고구마 큐브", image: "treats.jpg", price: 7900, trial_price: 2900, subscribable: true,
    description: "한입 크기 큐브로 쪄서 말렸어요. 식이섬유가 들어 있는 곡물 대체 간식이에요.",
    spec: { 주원료: "국내산 고구마 100%", 중량: "100g", 급여: "체중 5kg 기준 하루 3~4개", 식감: "쫀득함" },
    concerns: ["digest"], main_ingredients: ["고구마"], why: { digest: "식이섬유가 있는 단일 원료 간식" },
    stock: 100, active: true, sort: 3,
  },
  {
    id: "mat", category: "living", name: "미끄럼 방지 매트", image: "mat.jpg", price: 39000, trial_price: null, subscribable: false,
    description: "마루 위에서 다리가 벌어지지 않도록 잡아주는 쿠션 매트예요. 물세탁 가능.",
    spec: { 크기: "120×90cm", 두께: "8mm", 소재: "폴리에스터, 논슬립 TPR", 세탁: "30℃ 이하 물세탁" },
    concerns: ["slip", "joint"], main_ingredients: [], why: { slip: "미끄러운 바닥에서 보행을 도와요", joint: "관절에 가는 충격을 줄여요" },
    stock: 100, active: true, sort: 4,
  },
  {
    id: "bed", category: "living", name: "도넛 쿠션 침대", image: "bed.jpg", price: 49000, trial_price: null, subscribable: false,
    description: "테두리가 낮아 노령견·노령묘도 쉽게 드나들어요. 커버 분리 세탁.",
    spec: { 크기: "지름 70cm", "입구 높이": "9cm", 소재: "부클레 원단, 극세사", 세탁: "커버 분리 세탁" },
    concerns: ["joint", "slip"], main_ingredients: [], why: { joint: "입구가 낮아 관절 부담이 적어요", slip: "바닥 미끄럼 방지 처리" },
    stock: 100, active: true, sort: 5,
  },
  {
    id: "brush", category: "living", name: "부드러운 핀 브러시", image: "brush.jpg", price: 15000, trial_price: null, subscribable: false,
    description: "끝이 둥근 핀이라 얇아진 피부에도 자극이 적어요.",
    spec: { 크기: "21×10cm", 핀: "끝 둥근 스테인리스", 손잡이: "미끄럼 방지 실리콘" },
    concerns: ["skin"], main_ingredients: [], why: { skin: "피부 자극이 적은 둥근 핀" },
    stock: 100, active: true, sort: 6,
  },
  {
    id: "shampoo", category: "living", name: "마일드 저자극 샴푸", image: "shampoo.jpg", price: 16900, trial_price: null, subscribable: true,
    description: "향을 줄인 약산성 샴푸예요. 노령 동물의 건조한 피부를 고려했어요.",
    spec: { 용량: "1,000ml", pH: "약산성", 향: "무향에 가까운 저향" },
    concerns: ["skin"], main_ingredients: [], why: { skin: "약산성·저향 처방" },
    stock: 100, active: true, sort: 7,
  },
  {
    id: "harness", category: "living", name: "보행 보조 하네스", image: "harness.jpg", price: 32000, trial_price: null, subscribable: false,
    description: "등 손잡이로 계단이나 차에 오를 때 몸을 살짝 받쳐줄 수 있어요.",
    spec: { 사이즈: "S / M / L", 소재: "에어메쉬, 나일론 웨빙", 특징: "등 손잡이, 2점 조절" },
    concerns: ["joint"], main_ingredients: [], why: { joint: "계단·차량 승하차를 보조해요" },
    stock: 100, active: true, sort: 8,
  },
];
