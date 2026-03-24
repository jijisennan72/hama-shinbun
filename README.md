# 浜新聞 (Hama Shinbun)

浜地区の地域住民向けポータルアプリ

## セットアップ

### 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. `supabase/schema.sql` をSQL Editorで実行
3. Storage バケット `pdf-documents` を作成（公開バケット）

### 2. 環境変数設定

`.env.local` に以下を設定：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@hama.shizuku.net
```

VAPIDキーは以下で生成：
```bash
npx web-push generate-vapid-keys
```

### 3. 最初の管理者世帯を作成

Supabase AuthのSQL Editorで：
```sql
-- まずAuthユーザーを作成（Supabaseダッシュボードから手動で）
-- Email: 001@hama.local, Password: 1234（管理者用PIN）
-- その後、householdsテーブルに挿入：
INSERT INTO households (user_id, household_number, name, is_admin)
VALUES ('<auth-user-id>', '001', '管理者', TRUE);
```

### 4. ローカル開発

```bash
npm install
npm run dev
```

### 5. Vercel デプロイ

```bash
npx vercel
```

環境変数をVercelのダッシュボードにも設定してください。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL + Auth + Storage)
- **ホスティング**: Vercel
- **PWA**: Service Worker + Web App Manifest
- **プッシュ通知**: Web Push API (VAPID)

## 機能

1. 広報PDF閲覧・バックナンバー一覧
2. 回覧板既読確認（世帯単位）
3. イベント参加申込
4. 住民アンケート（重複回答防止）
5. 意見・要望フォーム
6. 緊急お知らせ・プッシュ通知
7. 管理者画面
