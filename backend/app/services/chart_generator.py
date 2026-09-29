"""
Academic Chart & Visual Graph Generation Engine for Gurukul AI.
Renders publication-grade matplotlib charts (Bar, Line, Pie, Grouped Bar)
into Base64 PNG data URLs for embedding in Reading Comprehension, Case Studies,
and Data Interpretation questions.
"""

import io
import re
import base64
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Modern academic color palettes
PALETTE = [
    "#4f46e5",  # Indigo
    "#059669",  # Emerald
    "#d97706",  # Amber
    "#e11d48",  # Rose
    "#0284c7",  # Sky Blue
    "#7c3aed",  # Violet
    "#0d9488",  # Teal
    "#ea580c",  # Orange
]


def _setup_matplotlib():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams["font.sans-serif"] = ["Segoe UI", "Arial", "DejaVu Sans", "sans-serif"]
    plt.rcParams["font.family"] = "sans-serif"
    return plt


def generate_chart_from_spec(spec: Dict[str, Any]) -> Optional[str]:
    """
    Renders a structured chart specification into a Base64 PNG data URL.
    
    spec format:
    {
        "type": "bar" | "line" | "pie" | "horizontal_bar" | "grouped_bar",
        "title": "Figure 1: Attendance at the Harvest Festival (2015-2020)",
        "x_label": "Year",
        "y_label": "Attendance (Visitors)",
        "labels": ["2015", "2016", "2017", "2018", "2019", "2020"],
        "datasets": [
            {"name": "Attendance", "data": [1200, 1350, 1500, 1650, 1800, 1900]}
        ]
    }
    """
    try:
        plt = _setup_matplotlib()
        chart_type = str(spec.get("type", "bar")).lower()
        title = spec.get("title", "Figure: Data Analysis")
        x_label = spec.get("x_label", "")
        y_label = spec.get("y_label", "")
        labels = [str(l) for l in spec.get("labels", [])]
        datasets = spec.get("datasets", [])

        if not labels or not datasets:
            return None

        fig, ax = plt.subplots(figsize=(7.5, 4.2), dpi=150)
        fig.patch.set_facecolor("#ffffff")
        ax.set_facecolor("#fafafa")

        if chart_type in ["pie", "donut"]:
            # Pie Chart
            data = datasets[0].get("data", [])
            colors = [PALETTE[i % len(PALETTE)] for i in range(len(labels))]
            
            # Filter zero/empty
            valid_indices = [i for i, v in enumerate(data) if v > 0]
            v_labels = [labels[i] for i in valid_indices]
            v_data = [data[i] for i in valid_indices]
            v_colors = [colors[i] for i in valid_indices]

            wedges, texts, autotexts = ax.pie(
                v_data,
                labels=v_labels,
                autopct="%1.1f%%",
                startangle=140,
                colors=v_colors,
                wedgeprops=dict(width=0.6 if chart_type == "donut" else 1.0, edgecolor="#ffffff", linewidth=2),
                textprops=dict(fontsize=10, fontweight="bold", color="#1e293b"),
            )
            for autotext in autotexts:
                autotext.set_color("#ffffff")
                autotext.set_fontsize(10)
                autotext.set_weight("bold")
            ax.set_title(title, fontsize=12, fontweight="bold", pad=16, color="#0f172a")

        elif chart_type == "line":
            # Line Chart
            for idx, ds in enumerate(datasets):
                name = ds.get("name", f"Series {idx + 1}")
                data = ds.get("data", [])
                color = ds.get("color", PALETTE[idx % len(PALETTE)])
                ax.plot(
                    labels,
                    data,
                    marker="o",
                    linewidth=2.5,
                    markersize=6,
                    color=color,
                    label=name if len(datasets) > 1 else None,
                )
                # Annotate points
                for x_val, y_val in zip(labels, data):
                    ax.annotate(
                        f"{y_val:,.0f}" if isinstance(y_val, (int, float)) and y_val >= 10 else f"{y_val}",
                        (x_val, y_val),
                        textcoords="offset points",
                        xytext=(0, 7),
                        ha="center",
                        fontsize=8.5,
                        fontweight="bold",
                        color="#334155",
                    )

            ax.set_title(title, fontsize=12, fontweight="bold", pad=12, color="#0f172a")
            if x_label:
                ax.set_xlabel(x_label, fontsize=10, fontweight="bold", color="#334155", labelpad=8)
            if y_label:
                ax.set_ylabel(y_label, fontsize=10, fontweight="bold", color="#334155", labelpad=8)
            ax.grid(True, linestyle="--", alpha=0.5, color="#cbd5e1")
            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            ax.spines["left"].set_color("#94a3b8")
            ax.spines["bottom"].set_color("#94a3b8")
            if len(datasets) > 1:
                ax.legend(frameon=True, facecolor="#ffffff", edgecolor="#e2e8f0", fontsize=9)

        elif chart_type == "horizontal_bar":
            # Horizontal Bar
            data = datasets[0].get("data", [])
            color = datasets[0].get("color", PALETTE[0])
            y_pos = range(len(labels))
            bars = ax.barh(y_pos, data, color=color, edgecolor="#ffffff", height=0.55, alpha=0.9)
            ax.set_yticks(y_pos)
            ax.set_yticklabels(labels, fontsize=9.5, fontweight="bold", color="#1e293b")
            ax.invert_yaxis()
            ax.set_title(title, fontsize=12, fontweight="bold", pad=12, color="#0f172a")
            if x_label:
                ax.set_xlabel(x_label, fontsize=10, fontweight="bold", color="#334155", labelpad=8)
            ax.grid(axis="x", linestyle="--", alpha=0.5, color="#cbd5e1")
            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            ax.spines["left"].set_color("#94a3b8")
            ax.spines["bottom"].set_color("#94a3b8")
            for bar in bars:
                w = bar.get_width()
                ax.annotate(
                    f"{w:,.0f}" if w >= 10 else f"{w}",
                    (w, bar.get_y() + bar.get_height() / 2),
                    xytext=(5, 0),
                    textcoords="offset points",
                    ha="left",
                    va="center",
                    fontsize=8.5,
                    fontweight="bold",
                    color="#334155",
                )

        else:
            # Vertical / Grouped Bar Chart
            import numpy as np
            n_series = len(datasets)
            x = np.arange(len(labels))
            width = 0.7 / max(1, n_series)

            for idx, ds in enumerate(datasets):
                name = ds.get("name", f"Series {idx + 1}")
                data = ds.get("data", [])
                color = ds.get("color", PALETTE[idx % len(PALETTE)])
                offset = (idx - (n_series - 1) / 2) * width
                bars = ax.bar(x + offset, data, width=width, label=name if n_series > 1 else None, color=color, edgecolor="#ffffff", alpha=0.9)

                for bar in bars:
                    h = bar.get_height()
                    if h > 0:
                        ax.annotate(
                            f"{h:,.0f}" if h >= 10 else f"{h}",
                            (bar.get_x() + bar.get_width() / 2, h),
                            xytext=(0, 4),
                            textcoords="offset points",
                            ha="center",
                            va="bottom",
                            fontsize=8.5,
                            fontweight="bold",
                            color="#334155",
                        )

            ax.set_xticks(x)
            ax.set_xticklabels(labels, fontsize=9.5, fontweight="bold", color="#1e293b")
            ax.set_title(title, fontsize=12, fontweight="bold", pad=12, color="#0f172a")
            if x_label:
                ax.set_xlabel(x_label, fontsize=10, fontweight="bold", color="#334155", labelpad=8)
            if y_label:
                ax.set_ylabel(y_label, fontsize=10, fontweight="bold", color="#334155", labelpad=8)
            ax.grid(axis="y", linestyle="--", alpha=0.5, color="#cbd5e1")
            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            ax.spines["left"].set_color("#94a3b8")
            ax.spines["bottom"].set_color("#94a3b8")
            if n_series > 1:
                ax.legend(frameon=True, facecolor="#ffffff", edgecolor="#e2e8f0", fontsize=9)

        plt.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", dpi=150, facecolor=fig.get_facecolor(), edgecolor="none")
        plt.close(fig)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64}"

    except Exception as e:
        logger.warning("Failed to render chart from spec: %s", e)
        return None


def extract_and_generate_chart_from_text(passage_text: str) -> tuple[Optional[str], Optional[str]]:
    """
    Scans a passage for text tables or pseudo-charts like:
    Figure 1: Attendance at the Harvest Festival (2015-2020)
    2015: 1,200
    2016: 1,350
    2017: 1,500
    ...
    OR
    Figure 1: Renewable Energy Sources (2023)
    Solar: 45%
    Wind: 30%
    ...
    OR
    Quarterly sales of Product A, B, C (Q1-Q4 2023)
    Q1: A 500, B 300, C 200
    ...

    Returns:
        (chart_data_url, cleaned_passage_text)
    """
    if not passage_text or not isinstance(passage_text, str):
        return None, passage_text

    # Pattern 1: Multi-series quarterly/annual data:
    # Q1: A 500, B 300, C 200 or Q1: 500, 300
    multi_pattern = re.search(
        r"(?:Figure\s*\d*[:\-]?\s*)?([^\n]+(?:Sales|Production|Performance|Report|Attendance|Data|Statistics)[^\n]*)\n((?:(?:Q[1-4]|20\d\d|Year\s*\d|Month\s*\d)\s*:\s*[A-Za-z0-9,\.\s%]+\n?){3,})",
        passage_text,
        re.IGNORECASE,
    )
    if multi_pattern:
        title = multi_pattern.group(1).strip()
        data_block = multi_pattern.group(2).strip()
        lines = [l.strip() for l in data_block.split("\n") if l.strip()]

        labels = []
        series_map: Dict[str, List[float]] = {}
        is_multi_named = False

        for line in lines:
            # Parse "Q1: A 500, B 300, C 200" or "Q1: 500"
            parts = line.split(":", 1)
            if len(parts) != 2:
                continue
            lbl = parts[0].strip()
            rest = parts[1].strip()
            labels.append(lbl)

            # Check for "A 500, B 300"
            named_matches = re.findall(r"([A-Za-z0-9_\s]+?)\s+([0-9.,]+)%?", rest)
            if named_matches:
                is_multi_named = True
                for s_name, s_val in named_matches:
                    clean_name = s_name.strip()
                    try:
                        num = float(s_val.replace(",", ""))
                        if clean_name not in series_map:
                            series_map[clean_name] = []
                        series_map[clean_name].append(num)
                    except ValueError:
                        pass
            else:
                # Plain single number
                num_m = re.search(r"([0-9.,]+)", rest)
                if num_m:
                    try:
                        num = float(num_m.group(1).replace(",", ""))
                        if "Value" not in series_map:
                            series_map["Value"] = []
                        series_map["Value"].append(num)
                    except ValueError:
                        pass

        if labels and series_map:
            chart_type = "line" if len(labels) >= 4 and ("Q" in labels[0] or "20" in labels[0]) else "bar"
            datasets = [{"name": k, "data": v} for k, v in series_map.items()]
            spec = {
                "type": chart_type,
                "title": title.strip(),
                "labels": labels,
                "datasets": datasets,
                "y_label": "Value / Quantity",
            }
            chart_url = generate_chart_from_spec(spec)
            if chart_url:
                cleaned = passage_text.replace(data_block, "").strip()
                return chart_url, cleaned

    # Pattern 2: Single-series key-value list (Years or Categories with numbers or percentages):
    # Figure 1: Attendance at the Harvest Festival (2015-2020)
    # 2015: 1,200
    # 2016: 1,350
    # ...
    # OR
    # Solar: 45%
    # Wind: 30%
    kv_pattern = re.search(
        r"(?:(?:Figure|Chart|Graph|Table)\s*\d*[:\-]?\s*)?([^\n]+(?:Attendance|Sources|Distribution|Breakdown|Share|Overview|Sales|Trend|Growth)[^\n]*)\n((?:[A-Za-z0-9\s\-_/]+:\s*[0-9.,]+%?\n?){3,})",
        passage_text,
        re.IGNORECASE,
    )
    if kv_pattern:
        title = kv_pattern.group(1).strip()
        data_block = kv_pattern.group(2).strip()
        lines = [l.strip() for l in data_block.split("\n") if l.strip()]

        labels = []
        values = []
        is_percentage = False

        for line in lines:
            parts = line.split(":", 1)
            if len(parts) != 2:
                continue
            lbl = parts[0].strip()
            val_str = parts[1].strip()
            if "%" in val_str:
                is_percentage = True
            num_m = re.search(r"([0-9.,]+)", val_str)
            if num_m:
                try:
                    num = float(num_m.group(1).replace(",", ""))
                    labels.append(lbl)
                    values.append(num)
                except ValueError:
                    pass

        if len(labels) >= 3 and len(values) == len(labels):
            chart_type = "pie" if is_percentage or ("share" in title.lower() or "source" in title.lower()) else "bar"
            if not is_percentage and len(labels) >= 5 and any(l.isdigit() for l in labels):
                chart_type = "line"

            spec = {
                "type": chart_type,
                "title": title.strip(),
                "labels": labels,
                "datasets": [{"name": "Value", "data": values}],
                "y_label": "Percentage (%)" if is_percentage else "Units / Count",
            }
            chart_url = generate_chart_from_spec(spec)
            if chart_url:
                cleaned = passage_text.replace(data_block, "").strip()
                return chart_url, cleaned

    return None, passage_text
