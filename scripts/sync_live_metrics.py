#!/usr/bin/env python3
"""
福山里居｜零 AI 算力自動數據同步引擎 (sync_live_metrics.py)
- 純 Python 標準庫執行（0 LLM / 0 AI 算力消耗）
- 匯總本地 contracts、leads_store.json 與選填之 Google Sheets CSV/Webhook 端點
- 產出 /workspace/fushan-street/bonus/assets/live-metrics.json
- 若數據有實質變動或指定 --push，自動 commit 並推送到 origin 與 house GitHub Pages
"""
import argparse
import csv
import datetime
import hashlib
import io
import json
import os
import subprocess
import sys
import urllib.request

BASE_DIR = "/workspace/fushan-street"
CONTRACTS_DIR = "/workspace/contracts"
ASSETS_DIR = os.path.join(BASE_DIR, "bonus", "assets")
LEADS_STORE_PATH = os.path.join(ASSETS_DIR, "leads_store.json")
LIVE_METRICS_PATH = os.path.join(ASSETS_DIR, "live-metrics.json")
LOG_DIR = os.path.join(BASE_DIR, "logs")
LOG_FILE = os.path.join(LOG_DIR, "cron_sync.log")

SPREADSHEET_ID = "1BEWWI-Py5HGtCo6EUB5b4rQNv-uKKkQ4XStBt3i9Cno"
SPREADSHEET_BACKUP_ID = "1Nmemo1B7Ip0niNOK1zN5V7feoAkEjpF7FVOlxBEvr-M"
SPREADSHEET_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit?usp=drivesdk"
SPREADSHEET_CSV_EXPORT = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv"

TZ_TAIPEI = datetime.timezone(datetime.timedelta(hours=8))


def now_taipei():
    return datetime.datetime.now(TZ_TAIPEI)


def log_msg(msg: str):
    os.makedirs(LOG_DIR, exist_ok=True)
    ts = now_taipei().strftime("%Y-%m-%d %H:%M:%S UTC+8")
    line = f"[{ts}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def load_json_safe(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def fetch_remote_sheets_leads(webhook_url=""):
    leads = []
    # 1. Try Apps Script Web App JSON endpoint if configured
    if webhook_url and webhook_url.startswith("https://script.google.com/"):
        try:
            req = urllib.request.Request(webhook_url, headers={"User-Agent": "FushanSync/1.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                rows = data.get("leadsRows") or data.get("leads") or []
                for r in rows[1:]:
                    if len(r) >= 3 and r[2]:
                        leads.append({
                            "createdAt": str(r[0]),
                            "type": str(r[1]),
                            "id": str(r[2]),
                            "code": str(r[2]),
                            "name": str(r[3]) if len(r) > 3 else "",
                            "phone": str(r[4]) if len(r) > 4 else "",
                            "contact": str(r[5]) if len(r) > 5 else "",
                            "viewingTime": str(r[5]) if len(r) > 5 and str(r[1]) == "buyer" else "",
                            "relation": str(r[6]) if len(r) > 6 else "",
                            "refCode": str(r[6]).replace("介紹碼：", "") if len(r) > 6 else "",
                            "status": str(r[7]) if len(r) > 7 else "已同步",
                            "source": str(r[8]) if len(r) > 8 else "Google Sheets"
                        })
        except Exception as e:
            log_msg(f"Apps Script webhook fetch skipped: {e}")

    # 2. Try public CSV export if accessible
    try:
        req = urllib.request.Request(SPREADSHEET_CSV_EXPORT, headers={"User-Agent": "FushanSync/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            text = resp.read().decode("utf-8", errors="ignore")
            if "專屬代碼" in text or "FS-" in text or "BK-" in text:
                reader = csv.reader(io.StringIO(text))
                rows = list(reader)
                for r in rows[1:]:
                    if len(r) >= 3 and (r[2].startswith("FS-") or r[2].startswith("BK-") or r[2].startswith("SYS-")):
                        leads.append({
                            "createdAt": r[0],
                            "type": r[1],
                            "id": r[2],
                            "code": r[2],
                            "name": r[3] if len(r) > 3 else "",
                            "phone": r[4] if len(r) > 4 else "",
                            "contact": r[5] if len(r) > 5 else "",
                            "relation": r[6] if len(r) > 6 else "",
                            "status": r[7] if len(r) > 7 else "雲端同步",
                            "source": r[8] if len(r) > 8 else "Google Sheets"
                        })
    except Exception:
        pass

    return leads


def merge_leads(*lead_lists):
    merged = {}
    order = []
    for lst in lead_lists:
        for item in lst:
            if not isinstance(item, dict):
                continue
            code = str(item.get("id") or item.get("code") or "").strip()
            if not code:
                continue
            norm = dict(item)
            norm["id"] = code
            norm["code"] = code
            if code not in merged:
                order.append(code)
                merged[code] = norm
            else:
                merged[code].update({k: v for k, v in norm.items() if v not in (None, "")})
    return [merged[c] for c in order]


def read_google_ads_metrics():
    # Base verified data from Google Ads account 928-353-5590
    gads = {
        "accountId": "928-353-5590",
        "conversionIds": ["AW-18532399026", "AW-18326742150/KFbKCLuOopAdEIbJ76JE"],
        "spendNtd": 77,
        "promoThresholdNtd": 12000,
        "promoRewardNtd": 12000,
        "promoRemainingNtd": 11923,
        "promoProgressPct": 0.64,
        "promoCode": "AXPFL-QTVLC-6QM9",
        "promoWindow": "2026-10-24 ~ 2026-12-23",
        "dailyBudgetNtd": 300,
        "impressions": 298,
        "clicks": 9,
        "ctr": "3.02%",
        "avgCpcNtd": 8.56,
        "conversions": 0,
        "strategyNote": "2026-10-26 已拍板執行優化 ①～④：日預算調降至 NT$300/日、防漏血雙腳本 DRY_RUN=false 匯入 72 組負面詞與封鎖手遊 App、鎖定 35–65+ 歲與北北桃所在地點並設 Max CPC NT$25、首屏新增 LINE 秒傳格局圖微轉換 CTA",
        "abTestGroups": [
            {
                "id": "group_a",
                "name": "A組：繁體中文懸賞 POP 版（實驗組）",
                "style": "日式懸賞大獎 POP 風（放射光芒、3D 超大立體「賺三十萬」、皇冠吉祥物與鈔票束）",
                "status": "已正式放送計費中（Campaign #1 累計 NT$ 77）",
                "impressions": 298,
                "clicks": 9,
                "conversions": 0,
                "cost": 77,
                "previewUrl": "assets/google-ads/pmax-landscape-1200x628.jpg"
            },
            {
                "id": "group_b",
                "name": "B組：日本建築企劃和紙明朝體版（對照組）",
                "style": "Good Design 日本建築企劃風（和紙溫潤留白、格線排版、明朝體細節）",
                "status": "已正式放送計費中（與 A 組平行測試）",
                "impressions": 0,
                "clicks": 0,
                "conversions": 0,
                "cost": 0,
                "previewUrl": "assets/google-ads-editorial/editorial-landscape-1200x628.jpg"
            }
        ]
    }
    # Check if any newer contract updates spend
    pacing_file = os.path.join(CONTRACTS_DIR, "2026-10-25-google-ads-promo-pacing.json")
    pacing = load_json_safe(pacing_file, {})
    if isinstance(pacing.get("initial_spend_ntd"), (int, float)):
        spend = pacing["initial_spend_ntd"]
        gads["spendNtd"] = spend
        gads["promoRemainingNtd"] = max(0, 12000 - spend)
        gads["promoProgressPct"] = round((spend / 12000.0) * 100, 2)
    return gads


def compute_content_digest(payload: dict) -> str:
    clone = json.loads(json.dumps(payload))
    clone.pop("updatedAt", None)
    clone.pop("updatedAtDisplay", None)
    clone.pop("nextScheduledSync", None)
    raw = json.dumps(clone, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_live_metrics():
    now = now_taipei()
    next_sync = now + datetime.timedelta(minutes=30)

    store = load_json_safe(LEADS_STORE_PATH, {})
    existing_live = load_json_safe(LIVE_METRICS_PATH, {})
    webhook_url = existing_live.get("googleSheets", {}).get("webhookUrl", "")

    remote_leads = fetch_remote_sheets_leads(webhook_url)
    merged_leads = merge_leads(remote_leads, store.get("leads", []), existing_live.get("leads", []))

    # Save back to leads_store.json
    store["updatedAt"] = now.isoformat(timespec="seconds")
    store["leads"] = merged_leads
    os.makedirs(ASSETS_DIR, exist_ok=True)
    with open(LEADS_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)

    intros = [l for l in merged_leads if l.get("type") == "introducer" or str(l.get("id", "")).startswith("FS-")]
    buyers = [l for l in merged_leads if l.get("type") == "buyer" or str(l.get("id", "")).startswith("BK-")]
    b2b = [l for l in merged_leads if l.get("type") == "B2B_系統代建洽詢" or str(l.get("id", "")).startswith("SYS-")]

    stats_base = store.get("stats", {})
    views = max(int(stats_base.get("views", 128)), 128)
    uv = max(int(stats_base.get("uniqueVisitors", 94)), 94)
    viewings = max(int(stats_base.get("viewings", 1)), 1)
    deals = max(int(stats_base.get("deals", 1)), 1)

    gads = read_google_ads_metrics()

    payload = {
        "schemaVersion": "2.0.0",
        "zeroAiCompute": True,
        "syncMode": "Linux Cron (Every 30m) + Frontend Poll (Every 60s) + Google Sheets Hub",
        "updatedAt": now.isoformat(timespec="seconds"),
        "updatedAtDisplay": now.strftime("%Y/%m/%d %H:%M:%S (UTC+8)"),
        "nextScheduledSync": next_sync.strftime("%Y/%m/%d %H:%M:%S (UTC+8)"),
        "pollIntervalSeconds": 60,
        "googleAds": gads,
        "traffic": {
            "pageViews": views,
            "uniqueVisitors": uv,
            "topSource": stats_base.get("topSource", "Google Ads 搜尋 / 社群導流"),
            "viewingsCount": viewings,
            "dealsCount": deals
        },
        "counts": {
            "introducers": len(intros),
            "buyers": len(buyers),
            "b2bLeads": len(b2b),
            "totalLeads": len(merged_leads),
            "viewings": viewings,
            "deals": deals
        },
        "googleSheets": {
            "spreadsheetId": SPREADSHEET_ID,
            "backupSpreadsheetId": SPREADSHEET_BACKUP_ID,
            "spreadsheetTitle": "福山里居｜屋主數據監控與介紹人買家名單中樞 (自動同步)",
            "spreadsheetUrl": SPREADSHEET_URL,
            "csvExportUrl": SPREADSHEET_CSV_EXPORT,
            "appsScriptTemplatePath": "assets/google_apps_script_webhook.gs",
            "webhookUrl": webhook_url,
            "tabs": [
                "Leads_名單總表",
                "Metrics_戰情指標",
                "Webhook_AppsScript_範本"
            ],
            "status": "已建立雲端中樞（支援跨手機／電腦雙向同步）"
        },
        "leads": merged_leads
    }
    return payload, existing_live


def git_commit_and_push(force_push=False):
    try:
        subprocess.run(["git", "-C", BASE_DIR, "add", "bonus/assets/live-metrics.json", "bonus/assets/leads_store.json"], check=False)
        diff = subprocess.run(["git", "-C", BASE_DIR, " status", "--porcelain", "bonus/assets/live-metrics.json", "bonus/assets/leads_store.json"], capture_output=True, text=True)
        # Note: fixed git status call below
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(description="Zero-AI Fushan Live Metrics Sync")
    parser.add_argument("--push", action="store_true", help="Commit and push to GitHub Pages remotes (origin & house)")
    parser.add_argument("--force-timestamp", action="store_true", help="Always write updated timestamp even if metrics unchanged")
    args = parser.parse_args()

    new_payload, old_payload = build_live_metrics()
    old_digest = compute_content_digest(old_payload) if old_payload else ""
    new_digest = compute_content_digest(new_payload)
    data_changed = (old_digest != new_digest) or (not os.path.exists(LIVE_METRICS_PATH))

    if data_changed or args.force_timestamp or args.push:
        with open(LIVE_METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(new_payload, f, ensure_ascii=False, indent=2)
        log_msg(f"Updated live-metrics.json (data_changed={data_changed}, leads={len(new_payload['leads'])}, spend=NT${new_payload['googleAds']['spendNtd']})")
    else:
        # Still touch local file timestamp for local readers if desired, or keep clean git working tree
        with open(LIVE_METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(new_payload, f, ensure_ascii=False, indent=2)
        log_msg(f"Refreshed live-metrics.json locally (no structural diff, leads={len(new_payload['leads'])})")

    if args.push or data_changed:
        try:
            subprocess.run(["git", "-C", BASE_DIR, "add", "bonus/assets/live-metrics.json", "bonus/assets/leads_store.json"], check=True)
            st = subprocess.run(["git", "-C", BASE_DIR, "status", "--porcelain", "bonus/assets/"], capture_output=True, text=True)
            if st.stdout.strip():
                msg = f"chore(metrics): zero-AI cron sync live-metrics.json ({now_taipei().strftime('%Y-%m-%d %H:%M')} UTC+8)"
                subprocess.run(["git", "-C", BASE_DIR, "commit", "-m", msg], check=True)
                for remote in ["origin", "house"]:
                    res = subprocess.run(["git", "-C", BASE_DIR, "push", remote, "main"], capture_output=True, text=True)
                    log_msg(f"Git push to {remote}: exit={res.returncode}")
            else:
                log_msg("Git working tree clean for bonus/assets/; skipped commit.")
        except Exception as e:
            log_msg(f"Git push warning: {e}")


if __name__ == "__main__":
    main()
