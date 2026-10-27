# Hướng dẫn cài đặt và chạy trên server


- Ubuntu Server 22.04/24.04 hoặc máy chủ Linux tương đương.
- Cài Docker Engine và Docker Compose plugin.
- Trỏ hai tên miền/subdomain về IP server, ví dụ `crm.example.com` và `api.example.com`.
- Mở cổng SSH, HTTP (80) và HTTPS (443) trên firewall. Các cổng ứng dụng, database và Redis được bind vào localhost.


git clone <URL_REPOSITORY> zalo-crm
cd zalo-crm
cp .env.example .env
```


Mở `.env` và thay các giá trị mẫu:

- `MYSQL_PASSWORD`: mật khẩu riêng cho database.
- `MYSQL_ROOT_PASSWORD`: mật khẩu root MariaDB khác với mật khẩu database.
- `JWT_SECRET`: chuỗi bí mật ngẫu nhiên dài, không dùng lại mật khẩu khác.
- `WEB_ORIGIN`: URL giao diện web, ví dụ `https://crm.example.com`.
- `PUBLIC_API_URL` và `NEXT_PUBLIC_API_URL`: URL public của API, ví dụ `https://api.example.com`.
- `API_SERVER_URL`: giữ là `http://api:4000` để Next.js trong Docker gọi API qua mạng nội bộ.

Nên dùng mật khẩu chỉ gồm chữ và số để URL kết nối MariaDB trong Compose không cần mã hóa ký tự đặc biệt. Không đưa file `.env` lên Git.


Cấu hình Nginx, Caddy hoặc proxy tương đương:

- `crm.example.com` → `http://127.0.0.1:3000`.
- `api.example.com` → `http://127.0.0.1:4000`.
- Bật chuyển tiếp WebSocket cho `api.example.com` vì Inbox dùng kết nối realtime.
- Cấp chứng chỉ HTTPS cho cả hai tên miền.

## 5. Build và khởi chạy

```bash
docker compose up -d --build
docker compose ps
```

Container API tự chạy các migration Prisma trước khi khởi động ứng dụng. Xem log nếu có lỗi:

```bash
docker compose logs -f api
docker compose logs -f web
```

Mở `https://crm.example.com` để đăng nhập.


```bash
git pull
docker compose up -d --build
```

Database lưu trong volume `mariadb_data`; file upload lưu trong `api_uploads`. Giữ các volume này khi cập nhật để không xóa dữ liệu.
