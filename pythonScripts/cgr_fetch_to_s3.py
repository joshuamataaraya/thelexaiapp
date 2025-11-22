#!/usr/bin/env python3
import argparse
import datetime as dt
import re
import sys
from typing import List, Dict, Set
from urllib.parse import urlparse

import boto3
import requests

BASE_URL = "https://cgrbuscador.cgr.go.cr/BuscadorWebCGR/testcsv"
S3_BUCKET = "knowledge-base-thelexai-laws-datasource-cri"
PROFILE_NAME = "thelexai-profile-us-east-2"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Fetch CGR CSV results and upload PDFs to S3."
    )
    parser.add_argument(
        "-d",
        "--date",
        action="append",
        help="Specific date in YYYY-MM-DD (can be used multiple times).",
    )
    parser.add_argument(
        "--start-date",
        help="Start date (inclusive) in YYYY-MM-DD, used with --end-date.",
    )
    parser.add_argument(
        "--end-date",
        help="End date (inclusive) in YYYY-MM-DD, used with --start-date.",
    )
    parser.add_argument(
        "--region",
        help="AWS region for S3 client (optional; otherwise boto3 default is used).",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=1000,
        help="Safety cap on pages per date (default: 1000).",
    )
    return parser.parse_args()


def generate_dates_from_args(args) -> List[dt.date]:
    dates: List[dt.date] = []

    # Explicit dates
    if args.date:
        for d in args.date:
            try:
                dates.append(dt.date.fromisoformat(d))
            except ValueError:
                print(f"Invalid date format for --date: {d}. Use YYYY-MM-DD.", file=sys.stderr)
                sys.exit(1)

    # Range of dates
    if args.start_date or args.end_date:
        if not (args.start_date and args.end_date):
            print("Both --start-date and --end-date must be provided for a range.", file=sys.stderr)
            sys.exit(1)
        try:
            start = dt.date.fromisoformat(args.start_date)
            end = dt.date.fromisoformat(args.end_date)
        except ValueError as e:
            print(f"Invalid date format in range: {e}", file=sys.stderr)
            sys.exit(1)
        if start > end:
            print("--start-date must be <= --end-date.", file=sys.stderr)
            sys.exit(1)
        current = start
        while current <= end:
            dates.append(current)
            current += dt.timedelta(days=1)

    if not dates:
        print("You must provide at least one --date or a --start-date/--end-date range.", file=sys.stderr)
        sys.exit(1)

    # Remove duplicates & sort
    dates = sorted(set(dates))
    return dates


def date_to_cgr_format(d: dt.date) -> str:
    """Convert date to CGR format DD/MM/YYYY."""
    return d.strftime("%d/%m/%Y")


def fetch_csv_for_date_and_page(date_str_dmy: str, page: int) -> str:
    """
    Fetch raw CSV text for a given date (dd/mm/yyyy) and page.
    We filter by Fecha emision using fInicio & fFinal.
    """
    params = {
        "searchFacet": "",
        "searchFacetString": "",
        "tipoFacet": "",
        "searchText": "",
        "searchText1": "",
        "searchText2": "",
        "select1": "+",
        "select2": "+",
        "fInicio": date_str_dmy,   # filter start date
        "fFinal": date_str_dmy,    # filter end date (same as start -> that specific date)
        "recurrido": "",
        "searchEsp": "",
        "pageAct": page,
    }

    headers = {
        "User-Agent": "CGRFetcher/1.0 (Python script)",
    }

    resp = requests.get(BASE_URL, params=params, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.text


def parse_csv_rows(csv_text: str) -> List[Dict[str, str]]:
    """
    Parse rows from the special CSV format.

    We look for lines starting with "<number>;" and treat them as data rows.
    Separator is ';'. The columns we care about are:

    0: Row number
    1: Link
    2: Fecha emision
    3: Fecha publicacion
    4: Institucion
    5: Emite
    6: Tipo documental
    7: Proceso
    8+: Asunto (may contain semicolons -> join remainder)
    """
    rows: List[Dict[str, str]] = []
    for line in csv_text.splitlines():
        line = line.strip()
        if not line:
            continue
        if not re.match(r"^\d+;", line):
            # skip header, 'Cantidad Documentos', 'Pagina', etc.
            continue

        parts = line.split(";")
        if len(parts) < 2:
            continue

        row_number = parts[0].strip()
        link = parts[1].strip()

        # Gracefully handle missing columns
        fecha_emision = parts[2].strip() if len(parts) > 2 else ""
        fecha_publicacion = parts[3].strip() if len(parts) > 3 else ""
        institucion = parts[4].strip() if len(parts) > 4 else ""
        emite = parts[5].strip() if len(parts) > 5 else ""
        tipo_documental = parts[6].strip() if len(parts) > 6 else ""
        proceso = parts[7].strip() if len(parts) > 7 else ""
        asunto = ";".join(parts[8:]).strip() if len(parts) > 8 else ""

        rows.append(
            {
                "row_number": row_number,
                "link": link,
                "fecha_emision": fecha_emision,
                "fecha_publicacion": fecha_publicacion,
                "institucion": institucion,
                "emite": emite,
                "tipo_documental": tipo_documental,
                "proceso": proceso,
                "asunto": asunto,
            }
        )

    return rows


def build_s3_key_from_url(url: str) -> str:
    """
    Build an S3 key from the PDF URL.

    Example:
        https://cgrfiles.cgr.go.cr/publico/docs_cgr/2025/SIGYD_D/SIGYD_D_2025026742.pdf
    ->  publico/docs_cgr/2025/SIGYD_D/SIGYD_D_2025026742.pdf
    """
    parsed = urlparse(url)
    path = parsed.path.lstrip("/")
    if not path:
        # fallback: if something weird happens
        filename = parsed.netloc.replace(".", "_")
        return f"cgr/{filename}.pdf"
    return path


def download_pdf(url: str) -> bytes:
    headers = {
        "User-Agent": "CGRFetcher/1.0 (Python script)",
    }
    resp = requests.get(url, headers=headers, timeout=120)
    resp.raise_for_status()
    return resp.content


def upload_to_s3(s3_client, bucket: str, key: str, content: bytes):
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=content,
        ContentType="application/pdf",
    )


def process_date(
    s3_client,
    bucket: str,
    date: dt.date,
    max_pages: int,
    seen_urls: Set[str],
):
    date_str_dmy = date_to_cgr_format(date)
    print(f"\n=== Processing date {date.isoformat()} (CGR format {date_str_dmy}) ===")

    page = 1
    total_rows_for_date = 0

    while page <= max_pages:
        print(f"Fetching CSV for date {date_str_dmy}, page {page}...")
        try:
            csv_text = fetch_csv_for_date_and_page(date_str_dmy, page)
        except requests.HTTPError as e:
            print(f"HTTP error on page {page} for date {date_str_dmy}: {e}", file=sys.stderr)
            break
        except requests.RequestException as e:
            print(f"Network error on page {page} for date {date_str_dmy}: {e}", file=sys.stderr)
            break

        rows = parse_csv_rows(csv_text)
        if not rows:
            print(f"No more rows found for date {date_str_dmy} on page {page}. Stopping pagination.")
            break

        print(f"Found {len(rows)} document rows on page {page}.")

        for row in rows:
            url = row["link"]
            if not url.lower().endswith(".pdf"):
                print(f"Skipping non-PDF link: {url}")
                continue

            if url in seen_urls:
                # Avoid duplicates across pages/dates if they exist
                print(f"Already processed URL, skipping: {url}")
                continue

            seen_urls.add(url)
            total_rows_for_date += 1

            key = build_s3_key_from_url(url)
            print(f"Downloading and uploading: {url} -> s3://{bucket}/{key}")

            try:
                pdf_bytes = download_pdf(url)
            except requests.HTTPError as e:
                print(f"HTTP error when downloading {url}: {e}", file=sys.stderr)
                continue
            except requests.RequestException as e:
                print(f"Network error when downloading {url}: {e}", file=sys.stderr)
                continue

            try:
                upload_to_s3(s3_client, bucket, key, pdf_bytes)
            except Exception as e:
                print(f"Error uploading to S3 ({bucket}/{key}): {e}", file=sys.stderr)
                continue

        page += 1

    print(f"Finished date {date.isoformat()}. Total PDFs uploaded for this date: {total_rows_for_date}")


def main():
    args = parse_args()
    dates = generate_dates_from_args(args)

    session = boto3.Session(profile_name=PROFILE_NAME)
    s3_client = session.client("s3", region_name=(args.region or "us-east-2"))


    seen_urls: Set[str] = set()

    print(f"Will process {len(dates)} date(s): {[d.isoformat() for d in dates]}")

    for d in dates:
        process_date(
            s3_client=s3_client,
            bucket=S3_BUCKET,
            date=d,
            max_pages=args.max_pages,
            seen_urls=seen_urls,
        )

    print("\nAll done.")


if __name__ == "__main__":
    main()
