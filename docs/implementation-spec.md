# Premium Gym Takip Uygulaması — Temiz Implementation Spec ve AI Promptları

Bu belge, Codex / Antigravity / GPT-5.5 / Gemini ile kişisel, offline-first, Android odaklı gym takip uygulamasını faz faz geliştirmek için kullanılacak temiz şartname ve prompt setidir.

---

## 0. Ürün Hedefi

Amaç, ilk günden devasa bir bulut sistemi kurmak değil; spor salonunda iki saniyede set girilebilen, internet bağlantısından bağımsız, yerel öncelikli ve premium hissiyatlı bir MVP geliştirmektir.

Uygulama ilk sürümde tek kullanıcı içindir. Hedef cihaz Android tabanlı Samsung Galaxy S24 FE'dir. Login, sosyal akış, abonelik, Supabase, Health Connect ve gelişmiş AI analizleri V2'ye bırakılır.

Ana öncelik: Aktif antrenman sırasında hızlı veri girişi.

---

## 1. Teknoloji Yığını

- Platform: Android, öncelik Samsung Galaxy S24 FE
- Framework: React Native + Expo + TypeScript
- Routing: Expo Router
- Yerel veritabanı: expo-sqlite
- Günler arası geçiş: react-native-pager-view
- Gesture kontrolleri: react-native-gesture-handler
- Animasyon/gesture uyumu: react-native-reanimated
- Opsiyonel PoC: react-native-body-highlighter
- Medya: local GIF assets, static mapping ile kullanılacak

---

## 2. Klasör Yapısı

```text
src/
  app/
    (tabs)/
      index.tsx
      calendar.tsx
      routines.tsx
    workout/
      [workoutId].tsx
    exercise/
      [exerciseId].tsx
  features/
    workout/
    calendar/
    routines/
    exercises/
  db/
    schema.ts
    migrations.ts
    seed.ts
    database.ts
    repositories/
      exerciseRepository.ts
      routineRepository.ts
      workoutRepository.ts
      setRepository.ts
  components/
  design-system/
    colors.ts
    typography.ts
    spacing.ts
  assets/
    gifs/
    assets_index.ts
```

---

## 3. Katı Mimari Kural

- UI bileşenleri raw SQL yazmayacak.
- UI bileşenleri doğrudan SQLite bağlantısı çağırmayacak.
- Tüm okuma/yazma işlemleri yalnızca `src/db/repositories/` altındaki typed repository fonksiyonları üzerinden yapılacak.
- Repository fonksiyonları TypeScript tipleriyle açıkça tanımlanacak.
- İş mantığı UI içine gömülmeyecek; `features/` veya repository/service katmanında tutulacak.

---

## 4. SQLite Type Mapping

SQLite tipleri şu şekilde kullanılacak:

```text
UUID değerleri: TEXT
Decimal değerleri: REAL
Boolean değerleri: INTEGER 0/1
Timestamp değerleri: ISO-8601 TEXT
Date değerleri: YYYY-MM-DD TEXT
JSON array/string değerleri: TEXT içinde JSON string
```

---

## 5. Veritabanı Şeması

### exercises

```text
id TEXT PRIMARY KEY                 -- örn: chest_press
slug TEXT UNIQUE NOT NULL           -- örn: chest_press
asset_key TEXT UNIQUE NOT NULL      -- assets_index.ts ile eşleşir
name TEXT NOT NULL
category TEXT NOT NULL              -- machine, free_weight, bodyweight, cardio, mobility
primary_muscle TEXT NOT NULL
secondary_muscles TEXT              -- JSON string, örn: ["triceps", "front_delts"]
track_type TEXT NOT NULL            -- weight_reps | distance_duration_incline | duration_only
instructions TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### routines

```text
id TEXT PRIMARY KEY
name TEXT NOT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### routine_exercises

```text
id TEXT PRIMARY KEY
routine_id TEXT NOT NULL REFERENCES routines(id)
exercise_id TEXT NOT NULL REFERENCES exercises(id)
order_index INTEGER NOT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### routine_sets

```text
id TEXT PRIMARY KEY
routine_exercise_id TEXT NOT NULL REFERENCES routine_exercises(id)
set_number INTEGER NOT NULL
target_weight REAL
target_reps INTEGER
target_distance_km REAL
target_incline REAL
target_duration_seconds INTEGER
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### workouts

```text
id TEXT PRIMARY KEY
routine_id TEXT REFERENCES routines(id)
scheduled_date TEXT NOT NULL        -- YYYY-MM-DD
start_time TEXT
end_time TEXT
status TEXT NOT NULL                -- planned | in_progress | completed
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

Kritik kural: Bir workout içindeki tüm setler tamamlanmadan status `completed` olmamalı.

### workout_exercises

```text
id TEXT PRIMARY KEY
workout_id TEXT NOT NULL REFERENCES workouts(id)
exercise_id TEXT NOT NULL REFERENCES exercises(id)
order_index INTEGER NOT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### sets

```text
id TEXT PRIMARY KEY
workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id)
set_number INTEGER NOT NULL
set_type TEXT NOT NULL              -- warmup | normal | drop | failure
is_completed INTEGER NOT NULL       -- 0/1
completed_at TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

### set_metrics

```text
set_id TEXT PRIMARY KEY REFERENCES sets(id)
weight REAL
reps INTEGER
distance_km REAL
incline REAL
duration_seconds INTEGER
rpe REAL
notes TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT
```

---

## 6. SQLite Constraints, Indexing ve Migration

Uygulama açılırken şu çalıştırılmalı:

```sql
PRAGMA foreign_keys = ON;
```

Zorunlu indexler:

```sql
CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id ON sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_set_metrics_set_id ON set_metrics(set_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_routine_exercise_id ON routine_sets(routine_exercise_id);
```

Migration için `PRAGMA user_version` kullanılmalı. Yeni tablo veya sütun eklendiğinde eski veri silinmemeli.

---

## 7. Seed Kuralları

- `seed.ts` idempotent olmalı.
- Uygulama her açıldığında 37 egzersiz tekrar tekrar çoğalmamalı.
- `INSERT OR IGNORE` veya `UPSERT / ON CONFLICT` kullanılmalı.
- GIF dosyası olmayan egzersiz uygulamayı çökertmemeli; placeholder veya metin alanı gösterilmeli.

---

## 8. track_type Enum ve Validasyon

`track_type` strict enum olarak kodlanacak:

```text
weight_reps
distance_duration_incline
duration_only
```

Alan kuralları:

```text
weight_reps:
  required: weight, reps
  nullable: distance_km, incline, duration_seconds

distance_duration_incline:
  required: distance_km, incline, duration_seconds
  nullable: weight, reps

duration_only:
  required: duration_seconds
  nullable: weight, reps, distance_km, incline
```

---

## 9. GIF Standartları

- Dosya adlarında Türkçe karakter, boşluk, büyük harf kullanılmayacak.
- Doğru: `interval_kosu.gif`, `tek_kol_dumbbell_curl.gif`, `chest_press.gif`
- Yanlış: `interval_koşu.gif`, `Chest Press.gif`
- `exercises.asset_key`, GIF dosya adıyla uzantısız birebir eşleşmeli.
- `assets/assets_index.ts` içinde tüm GIF'ler static require ile map edilmeli.
- Dinamik require yasak: `require('./gifs/' + name + '.gif')` kullanılmayacak.

Örnek:

```ts
export const ExerciseGifs = {
  chest_press: require('./gifs/chest_press.gif'),
  barbell_squat: require('./gifs/barbell_squat.gif'),
  treadmill: require('./gifs/treadmill.gif'),
} as const;
```

---

## 10. Ekranlar

### Ana Ekran

- Uygulama açılınca bugünün antrenmanı gösterilir.
- Sağ/sol swipe ile önceki ve sonraki güne geçilir.
- Bitmemiş antrenman varsa büyük `Devam Et` butonu görünür.
- Bitmişse `Tamamlandı` görünür.

### Takvim

- Ay/hafta görünümü.
- Tek tık: o günün planlanan/tamamlanan antrenman detayını açar.
- Uzun basma: o güne şablon/antrenman ekleme menüsünü açar.

### Aktif Antrenman

- MVP'nin en kritik ekranıdır.
- Egzersizler kart/satır halinde listelenir.
- Değerler inline girilir.
- Kutuya tıklanınca numeric keyboard açılır.
- Önceki set değerleri `PREVIOUS` sütununda soluk gri gösterilir.
- Tüm setler tamamlanınca workout otomatik `completed` olur.

### Egzersiz Detayı

- Üstte GIF.
- Altta talimat metni.
- Anatomik harita sadece PoC kaliteli çıkarsa eklenir; aksi halde V2'ye bırakılır.

### Routines

- Şablon oluşturma ve düzenleme.
- Şablon içinde hareket sırası ve hedef setler tutulur.
- Takvimde uzun basma ile güne atanabilir.

---

## 11. UI/UX Kuralları

- Karanlık mod ana tema.
- Arka plan: `#121212`
- Metin: `#E0E0E0`
- Font weight: 500 veya 600
- Gereksiz dumbbell, alev, madalya gibi ikonlar kullanılmayacak.
- Tasarım dili: temiz, minimalist, geniş dokunma alanları, spreadsheet benzeri veri girişi.
- Salonda terli elle hızlı kullanım öncelikli.

---

## 12. QA / Acceptance Tests

Faz 1 testleri:

- Expo uygulaması Android cihazda açılır.
- SQLite init ve migrations hata vermez.
- `PRAGMA foreign_keys = ON` uygulanır.
- 37 egzersiz idempotent şekilde seed edilir.
- Uygulama yeniden açıldığında egzersizler çoğalmaz.
- `assets_index.ts` TypeScript hatası vermez.
- UI içinde raw SQL bulunmaz.
- Repository fonksiyonları typed olur.

Faz 2 testleri:

- Ana ekranda bugünün workout'u görünür.
- Swipe ile dün/yarın verisi çekilir.
- Takvim tek tık ve uzun basma çakışmaz.
- Şablon oluşturulabilir.
- Şablon takvime atanabilir.

Faz 3 testleri:

- Aktif antrenmanda set ekleme/silme/güncelleme çalışır.
- Inline input onBlur ile repository çağırır.
- `track_type` kuralları doğru inputları gösterir.
- Önceki set değerleri görünür.
- Tüm setler tamamlanınca workout status `completed` olur.

---

## 13. MVP Kapsamı

### Faz 1 — Çekirdek Kurulum

- Expo + TypeScript proje kurulumu
- Expo Router kurulumu
- SQLite bağlantısı
- Migration sistemi
- Schema oluşturma
- Repository katmanı
- Idempotent seed
- assets_index.ts
- body-highlighter mini PoC

### Faz 2 — Ana Ekran, Takvim, Routines

- Pager tabanlı günlük görünüm
- Takvim
- Tek tık / uzun basma
- Routine oluşturma
- Routine set hedefleri
- Routine'i güne atama

### Faz 3 — Aktif Antrenman

- Inline workout logger
- Ağırlık / tekrar / kardiyo / süre inputları
- PREVIOUS sütunu
- Set type
- Completion business logic

### V2'ye bırakılanlar

- Supabase sync
- Auth
- Health Connect
- Apple Health
- RevenueCat
- Gelişmiş grafikler
- AI analizleri
- Anatomik haritanın tam entegrasyonu

---

# CODEX PROMPTLARI

## Prompt 1 — Faz 1'i Başlat

```text
Bu repository içinde kişisel, offline-first, Android odaklı bir gym takip uygulaması geliştiriyoruz.

Sana verdiğim Implementation Spec'e birebir uy. Şimdilik yalnızca FAZ 1'i uygula. UI ekranlarına ve aktif antrenman ekranına geçme.

FAZ 1 kapsamı:
1. Expo + React Native + TypeScript proje iskeletini kontrol et/kur.
2. Expo Router yapısını hazırla.
3. expo-sqlite bağlantısını kur.
4. PRAGMA foreign_keys = ON çalıştıran database init katmanını yaz.
5. PRAGMA user_version kullanan migration sistemini oluştur.
6. schema.ts içinde tüm tabloları, foreign key'leri ve indexleri tanımla.
7. seed.ts dosyasını idempotent yaz. 37 egzersiz INSERT OR IGNORE veya UPSERT ile seed edilmeli. App restart egzersizleri çoğaltmamalı.
8. assets/assets_index.ts içinde statik GIF mapping yapısını kur. Dinamik require kullanma.
9. db/repositories altında typed repository fonksiyonlarının temelini oluştur.
10. UI bileşenleri raw SQL çağırmayacak. Tüm DB işlemleri sadece repository katmanından yapılacak.
11. react-native-body-highlighter için sadece küçük bir PoC ekranı veya placeholder hazırlayabilirsin; ana odağı bozma.

Kısıtlar:
- Supabase, Auth, Health Connect, grafikler, AI analizleri ve aktif antrenman ekranı bu fazda kodlanmayacak.
- UI içinde raw SQL yasak.
- TypeScript tip güvenliği korunmalı.
- Kod bittikten sonra bana değişen dosyaları, çalıştırmam gereken komutları ve test checklist'ini yaz.
```

## Prompt 2 — Faz 1 Review / Fix

```text
Faz 1 kodunu review et.

Özellikle şunları kontrol et:
1. UI içinde raw SQL var mı?
2. Tüm DB işlemleri db/repositories altından mı yapılıyor?
3. PRAGMA foreign_keys = ON gerçekten database init sırasında çalışıyor mu?
4. PRAGMA user_version ile migration sistemi kurulmuş mu?
5. seed.ts idempotent mi? App restart egzersizleri çoğaltır mı?
6. assets_index.ts içinde dinamik require kullanılmış mı? Kullanılmışsa düzelt.
7. Foreign key ve indexler eksiksiz mi?
8. TypeScript hatası, import hatası veya Expo runtime hatası var mı?

Bulduğun sorunları düzelt. Sonunda kısa bir rapor ve test komutları ver.
```

## Prompt 3 — Faz 2'yi Başlat

```text
Faz 1 tamamlandıktan sonra şimdi FAZ 2'yi uygula.

Kapsam:
1. Ana ekranda bugünün workout görünümünü oluştur.
2. react-native-pager-view ile dün/bugün/yarın swipe mantığını kur.
3. Takvim ekranını oluştur.
4. Takvimde tek tık gün detayını açsın, uzun basma şablon ekleme modalını açsın.
5. Routines ekranını oluştur.
6. Routine oluşturma, routine_exercises ve routine_sets kayıtlarını repository üzerinden yaz.
7. Bir routine'i seçilen güne workout olarak atama fonksiyonunu yaz.

Kısıtlar:
- Aktif antrenman inline logger'ı Faz 3'e bırak.
- UI raw SQL çağırmayacak.
- Tüm database işlemleri repository fonksiyonlarıyla yapılacak.

İş bitince çalıştırmam gereken komutları ve test checklist'ini yaz.
```

## Prompt 4 — Faz 3'ü Başlat

```text
Faz 1 ve Faz 2 tamamlandı. Şimdi uygulamanın kalbi olan FAZ 3 Aktif Antrenman ekranını uygula.

Kapsam:
1. workout/[workoutId] ekranını oluştur.
2. Egzersizleri order_index'e göre kart/satır halinde göster.
3. Inline input sistemi kur. Kullanıcı başka ekrana yönlendirilmeden değer girebilmeli.
4. track_type enum'a göre input alanları göster:
   - weight_reps: weight + reps
   - distance_duration_incline: distance_km + incline + duration_seconds
   - duration_only: duration_seconds
5. set_type desteği ekle: warmup, normal, drop, failure.
6. PREVIOUS sütununda önceki tamamlanmış workout'taki aynı exercise/set değerlerini göster.
7. Set tamamlanınca is_completed = 1 ve completed_at yaz.
8. Bir workout içindeki tüm setler tamamlanınca workout status completed olmalı.
9. onBlur veya açık kaydetme aksiyonu repository fonksiyonlarını çağırmalı.

Kısıtlar:
- UI raw SQL çağırmayacak.
- Gelişmiş grafikler, AI analizleri, Supabase yok.
- Aktif ekran hızlı ve sade olmalı; gereksiz ikon kullanma.

İş bitince test checklist'i ve elle denemem gereken kullanıcı akışlarını yaz.
```

## Prompt 5 — Genel Audit

```text
Tüm projeyi architecture ve kalite açısından audit et.

Kontrol et:
1. Spec dışına çıkılmış mı?
2. UI içinde raw SQL var mı?
3. Repository pattern korunmuş mu?
4. track_type kuralları eksiksiz uygulanmış mı?
5. Completion mantığı doğru mu?
6. Seed idempotent mi?
7. Migration sistemi veri kaybını önlüyor mu?
8. Gereksiz ikon, karmaşık UI veya dandik AI görünümü oluşturan tasarım var mı?
9. Expo Android üzerinde çalışmayı bozabilecek import/native dependency hatası var mı?
10. TypeScript hataları var mı?

Sorunları listele, önem sırasına göre düzelt ve final test komutlarını ver.
```
