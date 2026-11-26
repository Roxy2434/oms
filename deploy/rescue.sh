#!/bin/sh
# Menu Cứu Hộ Nhanh Cho Lớp Học (Không cần sửa code)
# Chạy: sh deploy/rescue.sh   (hoặc sh deploy/rescue.sh 1 / 2 / 3 / 4)
set -eu
cd "$(dirname "$0")"
project="${OMS_COMPOSE_PROJECT:-oms-public}"
env_file="${OMS_COMPOSE_ENV:-.env}"

dc() {
 if [ -f prebuilt.yaml ] && docker image inspect oms-public-backend:20261126 >/dev/null 2>&1; then
  docker compose --env-file "$env_file" -p "$project" -f compose.yaml -f prebuilt.yaml "$@"
 else
  docker compose --env-file "$env_file" -p "$project" -f compose.yaml "$@"
 fi
}

choice="${1:-}"
if [ -z "$choice" ]; then
 echo "=========================================================="
 echo "   EZMART OMS — MENU CỨU HỘ NHANH CHO BUỔI BÁO CÁO LỚP   "
 echo "=========================================================="
 echo "  1) Bơm đầy tồn kho khẩn cấp (+400~500 món/SKU, giữ đơn cũ)"
 echo "  2) Bật / Tắt CAPTCHA đăng ký (cứu nguy khi mạng chặn Cloudflare)"
 echo "  3) Tạo sẵn 40 tài khoản học viên (lop01..lop40 / LopHoc2026)"
 echo "  4) Làm mới tiến trình Web & kiểm tra sức khỏe hệ thống"
 echo "  0) Thoát"
 echo "----------------------------------------------------------"
 printf "Nhập số (1-4): "
 read -r choice
fi

case "$choice" in
 1)
  echo "-> Đang bơm bổ sung tồn kho an toàn..."
  dc exec -T backend node node_modules/tsx/dist/cli.mjs scripts/classroom-rescue.ts restock
  dc exec -T backend node node_modules/tsx/dist/cli.mjs scripts/classroom-rescue.ts status
  ;;
 2)
  if [ ! -f "$env_file" ]; then echo "Không tìm thấy $env_file" >&2; exit 1; fi
  if grep -q "^OMS_DISABLE_CAPTCHA='1'" "$env_file" || grep -q "^OMS_DISABLE_CAPTCHA=1" "$env_file"; then
   sed -i.bak '/^OMS_DISABLE_CAPTCHA=/d' "$env_file" && rm -f "${env_file}.bak"
   printf "OMS_DISABLE_CAPTCHA='0'\n" >> "$env_file"
   echo "-> Đã BẬT LẠI xác minh CAPTCHA Turnstile."
  else
   sed -i.bak '/^OMS_DISABLE_CAPTCHA=/d;/^OMS_CLASSROOM_MODE=/d' "$env_file" && rm -f "${env_file}.bak"
   printf "OMS_CLASSROOM_MODE='1'\nOMS_DISABLE_CAPTCHA='1'\n" >> "$env_file"
   echo "-> Đã TẮT CAPTCHA đăng ký (sinh viên đăng ký trực tiếp không cần Cloudflare)."
  fi
  dc up -d --no-deps backend
  echo "-> Đã áp dụng cấu hình mới (không mất dữ liệu Database)."
  ;;
 3)
  echo "-> Đang khởi tạo 40 tài khoản học viên có sẵn 6.000.000đ ví..."
  dc exec -T backend node node_modules/tsx/dist/cli.mjs scripts/classroom-rescue.ts accounts 40
  ;;
 4)
  echo "-> Đang khởi động lại Web Backend & Edge..."
  dc restart backend edge
  sleep 3
  dc exec -T backend node node_modules/tsx/dist/cli.mjs scripts/classroom-rescue.ts status
  echo "-> Hệ thống đã sẵn sàng!"
  ;;
 0|"")
  exit 0
  ;;
 *)
  echo "Lựa chọn không hợp lệ: $choice" >&2
  exit 1
  ;;
esac
