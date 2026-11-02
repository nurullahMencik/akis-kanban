import type { LabelColor, Member, Priority } from "@/lib/types";

export type Stage = "backlog" | "todo" | "doing" | "review" | "done";

export interface CardSpec {
  title: string;
  stage: Stage;
  labels: string[];
  priority: Priority;
  estimate: number | null;
  assignees: string[];
  description?: string;
  checklist?: [text: string, done: boolean][];
  /** Due date as a day offset from today (negative = overdue). */
  due?: number;
  /** Explicit sprint membership for todo cards; in-flight and recently finished cards join automatically. */
  sprint?: boolean;
}

export interface BoardSpec {
  id: string;
  name: string;
  key: string;
  seed: number;
  createdDaysAgo: number;
  labels: { id: string; name: string; color: LabelColor }[];
  wip: { doing: number; review: number };
  /** Number of completions per 7-day window, oldest window first; the last window ends now. */
  doneWeeks: number[];
  sprint: { name: string } | null;
  members: string[];
  cards: CardSpec[];
}

export const MEMBERS: Member[] = [
  { id: "m-deniz", name: "Deniz Arslan", hue: 172, isCurrentUser: true },
  { id: "m-elif", name: "Elif Kaya", hue: 340 },
  { id: "m-mert", name: "Mert Demir", hue: 212 },
  { id: "m-zeynep", name: "Zeynep Aydın", hue: 28 },
  { id: "m-emre", name: "Emre Şahin", hue: 140 },
  { id: "m-selin", name: "Selin Öztürk", hue: 265 },
  { id: "m-burak", name: "Burak Çelik", hue: 48 },
  { id: "m-ayse", name: "Ayşe Yıldız", hue: 300 },
];

export const COLUMN_TEMPLATE: { stage: Stage; name: string; category: "backlog" | "todo" | "active" | "done" }[] = [
  { stage: "backlog", name: "Backlog", category: "backlog" },
  { stage: "todo", name: "Yapılacak", category: "todo" },
  { stage: "doing", name: "Devam Eden", category: "active" },
  { stage: "review", name: "İncelemede", category: "active" },
  { stage: "done", name: "Tamamlandı", category: "done" },
];

const MOBILE: BoardSpec = {
  id: "mobil-v2",
  name: "Mobil Bankacılık Uygulaması v2",
  key: "MB",
  seed: 20240611,
  createdDaysAgo: 46,
  labels: [
    { id: "ios", name: "iOS", color: "blue" },
    { id: "android", name: "Android", color: "green" },
    { id: "backend", name: "Backend", color: "violet" },
    { id: "design", name: "Tasarım", color: "rose" },
    { id: "security", name: "Güvenlik", color: "red" },
    { id: "bug", name: "Hata", color: "orange" },
    { id: "perf", name: "Performans", color: "teal" },
    { id: "a11y", name: "Erişilebilirlik", color: "amber" },
  ],
  wip: { doing: 4, review: 3 },
  doneWeeks: [3, 3, 4, 4, 4, 4],
  sprint: { name: "Sprint 14" },
  members: ["m-deniz", "m-elif", "m-mert", "m-zeynep", "m-emre", "m-selin", "m-burak", "m-ayse"],
  cards: [
    // ---- finished, in completion order
    {
      title: "Hesap hareketlerinde sonsuz kaydırma ve filtreleme",
      stage: "done",
      labels: ["ios", "android"],
      priority: "medium",
      estimate: 5,
      assignees: ["m-mert", "m-zeynep"],
      description:
        "Hareket listesi sayfalı olarak yükleniyor; kullanıcı **tarih aralığı**, **tutar** ve **işlem tipine** göre filtreleyebilmeli.",
      checklist: [
        ["Sayfalama API sözleşmesi", true],
        ["Filtre çekmecesi tasarımı", true],
        ["Boş durum ekranı", true],
      ],
    },
    {
      title: "Oturum zaman aşımı ve otomatik çıkış uyarısı",
      stage: "done",
      labels: ["security"],
      priority: "high",
      estimate: 3,
      assignees: ["m-emre"],
      description: "BDDK gereği 5 dakika işlem yapılmayan oturumlar kapatılmalı. Son 60 saniyede geri sayım uyarısı gösterilir.",
    },
    { title: "OTP SMS otomatik doldurma", stage: "done", labels: ["android"], priority: "medium", estimate: 2, assignees: ["m-zeynep"] },
    {
      title: "Karanlık mod renk paletinin güncellenmesi",
      stage: "done",
      labels: ["design"],
      priority: "low",
      estimate: 3,
      assignees: ["m-elif"],
    },
    {
      title: "Crashlytics kayıtlarındaki ilk 10 çökmenin giderilmesi",
      stage: "done",
      labels: ["bug", "ios", "android"],
      priority: "urgent",
      estimate: 8,
      assignees: ["m-mert", "m-burak"],
      description:
        "Son 30 günde kullanıcıların **%1,8**'i en az bir çökme yaşadı. İlk 10 çökme toplamın %72'sini oluşturuyor.\n\n- Çökme gruplarını sürüm bazında ayır\n- Her düzeltme için regresyon testi ekle",
      checklist: [
        ["Çökme gruplarının önceliklendirilmesi", true],
        ["iOS: 6 çökmenin düzeltilmesi", true],
        ["Android: 4 çökmenin düzeltilmesi", true],
        ["Sürüm notlarının hazırlanması", true],
      ],
    },
    {
      title: "IBAN doğrulama ve alıcı adı sorgulama",
      stage: "done",
      labels: ["backend"],
      priority: "high",
      estimate: 5,
      assignees: ["m-selin"],
    },
    {
      title: "Kayıtlı alıcılar listesinde arama ve favoriler",
      stage: "done",
      labels: ["ios", "android"],
      priority: "medium",
      estimate: 3,
      assignees: ["m-zeynep"],
    },
    {
      title: "Tasarım sistemi: buton ve form bileşenlerinin güncellenmesi",
      stage: "done",
      labels: ["design"],
      priority: "medium",
      estimate: 5,
      assignees: ["m-elif", "m-ayse"],
    },
    {
      title: "Görsel önbellekleme ile liste performansı iyileştirmesi",
      stage: "done",
      labels: ["perf"],
      priority: "medium",
      estimate: 3,
      assignees: ["m-burak"],
    },
    {
      title: "Uygulama içi güncelleme zorlaması (force update)",
      stage: "done",
      labels: ["backend", "ios", "android"],
      priority: "high",
      estimate: 2,
      assignees: ["m-selin", "m-mert"],
    },
    {
      title: "Root/jailbreak tespiti ve uyarı ekranı",
      stage: "done",
      labels: ["security"],
      priority: "high",
      estimate: 5,
      assignees: ["m-emre"],
    },
    { title: "KVKK aydınlatma metni onay ekranı", stage: "done", labels: ["design"], priority: "high", estimate: 2, assignees: ["m-ayse"] },
    {
      title: "VoiceOver etiketlerindeki eksiklerin tamamlanması",
      stage: "done",
      labels: ["a11y", "ios"],
      priority: "medium",
      estimate: 3,
      assignees: ["m-elif"],
    },
    {
      title: "Android 15 kenardan kenara (edge-to-edge) ekran uyumu",
      stage: "done",
      labels: ["android"],
      priority: "medium",
      estimate: 3,
      assignees: ["m-zeynep"],
    },
    {
      title: "Para transferinde mükerrer işlem koruması (idempotency key)",
      stage: "done",
      labels: ["backend", "security"],
      priority: "urgent",
      estimate: 5,
      assignees: ["m-selin", "m-emre"],
      description:
        "Ağ zaman aşımı sonrası kullanıcı tekrar denediğinde aynı transferin iki kez gerçekleşmemesi için her isteğe istemcide üretilen bir `Idempotency-Key` başlığı eklenir.",
    },
    { title: "Hesap özeti PDF dışa aktarımı", stage: "done", labels: ["backend"], priority: "low", estimate: 3, assignees: ["m-deniz"] },
    {
      title: "Push bildirim izin akışının yeniden tasarımı",
      stage: "done",
      labels: ["design", "ios"],
      priority: "medium",
      estimate: 2,
      assignees: ["m-ayse", "m-mert"],
    },
    {
      title: "E2E testleri için Detox altyapısının kurulması",
      stage: "done",
      labels: [],
      priority: "medium",
      estimate: 8,
      assignees: ["m-burak", "m-deniz"],
      checklist: [
        ["CI üzerinde iOS simülatör kurulumu", true],
        ["Android emülatör görüntüsü", true],
        ["Giriş akışı için ilk senaryo", true],
        ["Gece çalışan test planı", true],
      ],
    },
    {
      title: "Sertifika sabitleme (SSL pinning) uygulanması",
      stage: "done",
      labels: ["security", "ios", "android"],
      priority: "high",
      estimate: 5,
      assignees: ["m-emre"],
    },
    {
      title: "Hata ekranlarında yeniden deneme ve çevrimdışı durum",
      stage: "done",
      labels: ["design", "bug"],
      priority: "medium",
      estimate: 3,
      assignees: ["m-elif", "m-zeynep"],
    },
    { title: "Transfer limitleri ayarlar ekranı", stage: "done", labels: ["ios", "android"], priority: "medium", estimate: 3, assignees: ["m-mert"] },
    {
      title: "API gateway rate limit hatalarının kullanıcıya gösterimi",
      stage: "done",
      labels: ["backend", "bug"],
      priority: "high",
      estimate: 2,
      assignees: ["m-selin"],
    },
    // ---- in review
    {
      title: "FAST ile anlık para transferi akışı",
      stage: "review",
      labels: ["backend", "ios", "android"],
      priority: "urgent",
      estimate: 8,
      assignees: ["m-selin", "m-mert"],
      due: 2,
      description:
        "TCMB FAST sistemi üzerinden 7/24 anlık transfer. Tutar limiti ve alıcı doğrulaması backend tarafında yapılır.\n\n### Kabul kriterleri\n- Alıcı IBAN'ı girildiğinde ad-soyad maskeli gösterilir\n- Limit üstü tutarlarda EFT/havale önerilir\n- İşlem sonucu dekont olarak paylaşılabilir\n\n> Mükerrer işlem koruması (MB-15) ile birlikte test edilecek.",
      checklist: [
        ["API sözleşmesinin netleşmesi", true],
        ["Transfer onay ekranı", true],
        ["Dekont paylaşımı", true],
        ["Hata kodlarının eşlenmesi", true],
        ["Yük testi (500 TPS)", false],
      ],
    },
    {
      title: "Dinamik yazı boyutu desteği",
      stage: "review",
      labels: ["a11y"],
      priority: "medium",
      estimate: 3,
      assignees: ["m-elif"],
    },
    {
      title: "Sanal kart oluşturma ve dondurma",
      stage: "review",
      labels: ["ios", "android", "backend"],
      priority: "high",
      estimate: 5,
      assignees: ["m-zeynep", "m-selin"],
      due: 5,
    },
    {
      title: "Uygulama açılış süresini 2 saniyenin altına indirme",
      stage: "review",
      labels: ["perf"],
      priority: "high",
      estimate: 5,
      assignees: ["m-burak"],
      due: -1,
      description:
        "Soğuk açılış süresi şu an ortalama **3,4 sn** (p90: 4,8 sn). Hedef p90 < 2 sn.\n\n1. Açılışta senkron çalışan SDK başlatmalarını ertele\n2. İlk ekran verisini önbellekten göster\n3. Kullanılmayan font ve görselleri paketten çıkar",
      checklist: [
        ["Profiling raporu", true],
        ["SDK başlatmalarının ertelenmesi", true],
        ["Önbellekten ilk ekran", false],
      ],
    },
    // ---- in progress (one over the WIP limit on purpose)
    {
      title: "Biyometrik giriş için iOS FaceID entegrasyonu",
      stage: "doing",
      labels: ["ios", "security"],
      priority: "high",
      estimate: 5,
      assignees: ["m-mert", "m-emre"],
      due: 3,
      description:
        "iOS tarafında **LocalAuthentication** ile FaceID/TouchID girişi. Şifreyle giriş her zaman yedek yöntem olarak kalmalı.\n\n### Kabul kriterleri\n- İlk başarılı şifreli girişten sonra biyometrik giriş önerilir\n- Cihaza yeni yüz eklenirse anahtar geçersiz sayılır\n- 3 başarısız denemede şifre ekranına dönülür\n- `NSFaceIDUsageDescription` metni hukuk onaylı olmalı\n\nReferans: [LocalAuthentication](https://developer.apple.com/documentation/localauthentication)",
      checklist: [
        ["Keychain'de biyometri korumalı anahtar", true],
        ["LAContext ile doğrulama akışı", true],
        ["Biyometri değişikliğinde yeniden kayıt", true],
        ["Hata durumları ve şifreye dönüş", false],
        ["Hukuk onaylı izin metni", false],
      ],
    },
    {
      title: "Android parmak izi ile giriş (BiometricPrompt)",
      stage: "doing",
      labels: ["android", "security"],
      priority: "high",
      estimate: 5,
      assignees: ["m-zeynep"],
      due: 3,
    },
    {
      title: "Kart limit artırım ekranı",
      stage: "doing",
      labels: ["design", "backend"],
      priority: "medium",
      estimate: 3,
      assignees: ["m-ayse", "m-selin"],
      due: -2,
      description:
        "Kredi kartı sahibinin limit artırım talebini uygulama içinden iletebilmesi.\n\n### Kabul kriterleri\n- Mevcut limit ve önerilen limit aralığı gösterilir\n- Gelir bilgisi güncel değilse güncelleme adımı açılır\n- Talep sonucu push bildirim ve e-posta ile iletilir",
      checklist: [
        ["Ekran tasarımının onayı", true],
        ["Limit öneri servisi entegrasyonu", false],
        ["Sonuç bildirimi", false],
      ],
    },
    {
      title: "Döviz alım-satım ekranında canlı kur akışı (WebSocket)",
      stage: "doing",
      labels: ["backend", "perf"],
      priority: "high",
      estimate: 8,
      assignees: ["m-burak", "m-deniz"],
      description:
        "Kurlar şu an 30 sn'de bir **polling** ile çekiliyor. WebSocket'e geçerek hem gecikmeyi hem sunucu yükünü azaltacağız.\n\n- Bağlantı koparsa üstel geri çekilme ile yeniden bağlan\n- Uygulama arka plana geçince bağlantıyı kapat",
    },
    {
      title: "Fatura ödeme talimatı oluşturma",
      stage: "doing",
      labels: ["ios", "android"],
      priority: "medium",
      estimate: 3,
      assignees: ["m-elif"],
      due: 8,
    },
    // ---- to do
    {
      title: "QR kod ile ATM'den para çekme",
      stage: "todo",
      labels: ["backend", "security"],
      priority: "high",
      estimate: 8,
      assignees: [],
      due: 6,
      sprint: true,
      description: "ATM ekranındaki QR kod okutularak kartsız para çekme. QR kodun geçerlilik süresi 60 saniye.",
    },
    { title: "Kredi kartı ekstre detay ekranı", stage: "todo", labels: ["design"], priority: "medium", estimate: 3, assignees: ["m-ayse"], sprint: true },
    {
      title: "Onboarding: kimlik kartı NFC okuma",
      stage: "todo",
      labels: ["ios", "android", "security"],
      priority: "high",
      estimate: 8,
      assignees: ["m-mert"],
      due: -3,
      description:
        "Yeni müşteri kaydında T.C. kimlik kartındaki çipin NFC ile okunması. MRZ bilgisi kameradan okunup erişim anahtarı üretilecek.",
    },
    { title: "Ödeme isteği linki oluşturma ve paylaşma", stage: "todo", labels: ["backend"], priority: "medium", estimate: 5, assignees: [] },
    { title: "Güvenli klavye ile şifre girişi", stage: "todo", labels: ["security"], priority: "medium", estimate: 3, assignees: ["m-emre"], due: 12 },
    { title: "Kategori bazlı harcama analizi ekranı", stage: "todo", labels: ["design"], priority: "low", estimate: 5, assignees: ["m-elif"] },
    // ---- backlog
    { title: "iOS widget: hesap bakiyesi özeti", stage: "backlog", labels: ["ios"], priority: "low", estimate: 5, assignees: [] },
    {
      title: "Müşteri hizmetleri canlı sohbet entegrasyonu",
      stage: "backlog",
      labels: ["backend"],
      priority: "medium",
      estimate: 8,
      assignees: [],
    },
    { title: "Şube ve ATM haritasında konum izni akışı", stage: "backlog", labels: ["design"], priority: "low", estimate: 3, assignees: [] },
    {
      title: "Onboarding: görüntülü görüşme ile müşteri doğrulama",
      stage: "backlog",
      labels: ["backend", "security"],
      priority: "high",
      estimate: 13,
      assignees: [],
    },
    { title: "Yatırım hesabı portföy özet grafiği", stage: "backlog", labels: ["design"], priority: "low", estimate: 5, assignees: [] },
    { title: "Bütçe hedefi oluşturma ve bildirim eşikleri", stage: "backlog", labels: [], priority: "low", estimate: null, assignees: [] },
    {
      title: "Çoklu dil desteği: İngilizce metinlerin eklenmesi",
      stage: "backlog",
      labels: ["a11y"],
      priority: "medium",
      estimate: 3,
      assignees: [],
    },
    { title: "Feature flag servisi ile kademeli yayın", stage: "backlog", labels: ["backend"], priority: "medium", estimate: 5, assignees: ["m-deniz"] },
  ],
};

const SUMMER: BoardSpec = {
  id: "yaz-kampanyasi",
  name: "Yaz Kampanyası",
  key: "YK",
  seed: 7130,
  createdDaysAgo: 22,
  labels: [
    { id: "social", name: "Sosyal Medya", color: "violet" },
    { id: "design", name: "Tasarım", color: "rose" },
    { id: "content", name: "İçerik", color: "teal" },
    { id: "ads", name: "Reklam", color: "orange" },
    { id: "legal", name: "Hukuk", color: "slate" },
  ],
  wip: { doing: 3, review: 2 },
  doneWeeks: [1, 2, 1],
  sprint: null,
  members: ["m-deniz", "m-elif", "m-ayse", "m-burak", "m-selin"],
  cards: [
    { title: "Kampanya ana görsellerinin hazırlanması", stage: "done", labels: ["design"], priority: "high", estimate: 5, assignees: ["m-ayse"] },
    {
      title: "Katılım koşullarının hukuki onayı",
      stage: "done",
      labels: ["legal"],
      priority: "urgent",
      estimate: 2,
      assignees: ["m-deniz"],
    },
    { title: "Influencer iş birliği listesinin çıkarılması", stage: "done", labels: ["social"], priority: "medium", estimate: 3, assignees: ["m-elif"] },
    { title: "Google Ads anahtar kelime planı", stage: "done", labels: ["ads"], priority: "medium", estimate: 3, assignees: ["m-burak"] },
    {
      title: "Açılış sayfası (landing page) metinleri",
      stage: "review",
      labels: ["content"],
      priority: "high",
      estimate: 3,
      assignees: ["m-elif", "m-deniz"],
      description: "Ton: samimi ama güven veren. Başlık en fazla **8 kelime**, alt metin 2 cümle.",
    },
    { title: "E-posta bülteni: kampanya duyurusu", stage: "review", labels: ["content"], priority: "medium", estimate: 2, assignees: ["m-selin"] },
    {
      title: "Instagram Reels içerik takvimi",
      stage: "doing",
      labels: ["social", "content"],
      priority: "high",
      estimate: 5,
      assignees: ["m-ayse", "m-elif"],
      due: 4,
      checklist: [
        ["Haftalık tema listesi", true],
        ["Çekim planı", false],
        ["Yayın saatlerinin belirlenmesi", false],
      ],
    },
    {
      title: "Kampanya kodu üretimi ve CRM entegrasyonu",
      stage: "doing",
      labels: ["ads"],
      priority: "high",
      estimate: 5,
      assignees: ["m-burak"],
      due: -1,
    },
    { title: "A/B testi: kampanya banner varyasyonları", stage: "todo", labels: ["ads", "design"], priority: "medium", estimate: 3, assignees: [] },
    { title: "Mağaza içi afiş ve broşür baskısı", stage: "todo", labels: ["design"], priority: "medium", estimate: 2, assignees: ["m-ayse"], due: 9 },
    { title: "Basın bülteni taslağı", stage: "backlog", labels: ["content"], priority: "low", estimate: 2, assignees: [] },
    { title: "Kampanya sonrası performans raporu şablonu", stage: "backlog", labels: [], priority: "low", estimate: 3, assignees: [] },
  ],
};

export const BOARD_SPECS: BoardSpec[] = [MOBILE, SUMMER];
