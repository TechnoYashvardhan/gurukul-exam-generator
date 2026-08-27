"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface MathTextProps {
  content?: string | null;
  className?: string;
}

/**
 * Converts nested bracket matrix notation like [[1,2,0,3],[0,1,4,2],[5,0,2,1],[3,1,0,0]]
 * or [[1, 2], [3, 4]] into standard LaTeX pmatrix notation.
 */
function convertMatrixToLatex(text: string): string {
  const matrixRegex = /\[\s*(\[[^\[\]]+\](?:\s*,\s*\[[^\[\]]+\])*)\s*\]/g;

  return text.replace(matrixRegex, (fullMatch, inner) => {
    const rowMatches = inner.match(/\[([^\[\]]+)\]/g);
    if (!rowMatches || rowMatches.length === 0) return fullMatch;

    const latexRows = rowMatches.map((r: string) => {
      const clean = r.replace(/^\[|\]$/g, "").trim();
      const elements = clean.split(",").map((e: string) => e.trim());
      return elements.join(" & ");
    });

    const body = latexRows.join(" \\\\ ");
    return `$$\\begin{pmatrix} ${body} \\end{pmatrix}$$`;
  });
}

/**
 * Converts chemistry \ce{...} notation and chemical formulas into standard KaTeX notation.
 * e.g., \ce{2H2 + O2 -> 2H2O} -> $2\mathrm{H_2} + \mathrm{O_2} \rightarrow 2\mathrm{H_2O}$
 * e.g., \ce{Fe^{2+} + e- -> Fe+} -> $\mathrm{Fe}^{2+} + \mathrm{e}^- \rightarrow \mathrm{Fe}^+$
 */
function convertChemicalFormulas(text: string): string {
  // 1. Process \ce{...} tags
  let out = text.replace(/\\ce\{([^}]+)\}/g, (_, inner) => {
    let chem = inner.trim();
    // Replace reaction arrows
    chem = chem.replace(/->|\\to/g, " \\rightarrow ");
    chem = chem.replace(/<->|<=>/g, " \\rightleftharpoons ");
    
    // Split on spaces and operators while preserving them
    const parts = chem.split(/(\s+|\+|\-|\=|\b(?:\\rightarrow|\\rightleftharpoons)\b)/).filter(Boolean);
    const converted = parts.map((tok: string) => {
      const trimmed = tok.trim();
      if (!trimmed) return " ";
      if (["+", "-", "=", "\\rightarrow", "\\rightleftharpoons"].includes(trimmed)) {
        return trimmed;
      }
      // If coefficient number like '2' before formula
      const coefMatch = trimmed.match(/^(\d+)(.*)$/);
      let coef = "";
      let formula = trimmed;
      if (coefMatch && coefMatch[2]) {
        coef = coefMatch[1];
        formula = coefMatch[2];
      }
      // Subscripts for numbers (e.g. H2 -> H_2)
      let formatted = formula.replace(/([A-Za-z\)])(\d+)/g, "$1_{$2}");
      // Charges (e.g. Fe^2+, SO4^2-)
      formatted = formatted.replace(/\^\{?(\d*[\+\-])\}?/g, "^{$1}");
      return `${coef}\\mathrm{${formatted}}`;
    });
    return `$${converted.join(" ")}$`;
  });

  // 2. Normalize standalone formulas like H_2O, CO_2, H_2SO_4 outside math mode
  out = out.replace(/(?<!\$|\w)([A-Z][a-z]?)(_\{\d+\}|_\d+)([A-Z][a-z]?(?:_\{\d+\}|_\d+)?)*(?!\$|\w)/g, (match) => {
    return `$\\mathrm{${match}}$`;
  });

  return out;
}

/**
 * Preprocesses raw text to ensure all math/LaTeX expressions, matrices,
 * fractions, roots, cases, chemistry formulas, and equations are properly formatted with KaTeX delimiters,
 * while protecting spreadsheet cell references ($A$1, $B$1, E10), currency, and plain text from accidental LaTeX corruption.
 */
export function formatMathText(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // 1. Unescape literal \n into real newlines
  text = text.replace(/\\n/g, "\n");

  // 2. Convert chemistry \ce{...} expressions and chemical formulas
  text = convertChemicalFormulas(text);

  // 3. Escape Currency like $50,000 or $100 or $250.00 so remarkMath doesn't treat them as math opening delimiters
  text = text.replace(/(?<!\\)\$([0-9][0-9,]*)(?:\b|(?=[^a-zA-Z0-9$]))/g, (_, g1) => "\\$" + g1);

  // 4. Escape Excel / Spreadsheet cell references like $A$1, $B$1, $A1, $E$10 using safe callback replacers
  text = text.replace(/(?<!\\)\$([A-Z]+)\$([0-9]+)\b/g, (_, g1, g2) => "\\$" + g1 + "\\$" + g2);
  text = text.replace(/(?<!\\)\$([A-Z]+[0-9]+)\b/g, (_, g1) => "\\$" + g1);
  text = text.replace(/(?<!\\)\b([A-Z]+)\$([0-9]+)\b/g, (_, g1, g2) => g1 + "\\$" + g2);

  // 5. Matrix conversion: [[1,2],[3,4]] -> \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}
  text = convertMatrixToLatex(text);

  // 5. Convert flat matrix tuple syntax: A = (1 -1 0 2 3 4 0 1 2) [9 numbers] -> 3x3 pmatrix
  text = text.replace(/(\b(?:matrix|A|B|C|M|X|A\^\{-?1\}|A\^-1)\s*=\s*(?:\\frac\{1\}\{\d+\}\s*)?)\(([0-9\-.\s,]+)\)/g, (fullMatch, prefix, numsStr) => {
    const nums = numsStr.trim().split(/[\s,]+/).filter(Boolean);
    if (nums.length === 9) {
      const rows = [
        `${nums[0]} & ${nums[1]} & ${nums[2]}`,
        `${nums[3]} & ${nums[4]} & ${nums[5]}`,
        `${nums[6]} & ${nums[7]} & ${nums[8]}`
      ];
      return `${prefix}$$\\begin{pmatrix} ${rows.join(" \\\\ ")} \\end{pmatrix}$$`;
    } else if (nums.length === 4) {
      const rows = [
        `${nums[0]} & ${nums[1]}`,
        `${nums[2]} & ${nums[3]}`
      ];
      return `${prefix}$$\\begin{pmatrix} ${rows.join(" \\\\ ")} \\end{pmatrix}$$`;
    }
    return fullMatch;
  });

  // 6. Normalize LaTeX delimiters: \( ... \) -> $ ... $ and \[ ... \] -> $$ ... $$
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math.trim()}$$`);

  // 7. Wrap LaTeX environments like \begin{cases}...\end{cases}, \begin{pmatrix}...\end{pmatrix} if not already wrapped
  text = text.replace(/(\\begin\{(?:cases|pmatrix|vmatrix|bmatrix|matrix|aligned|array)\}[\s\S]*?\\end\{(?:cases|pmatrix|vmatrix|bmatrix|matrix|aligned|array)\})/g, (env) => {
    const fixedEnv = env.replace(/(?<!\\)\\\s+(?![a-zA-Z])/g, " \\\\ ");
    return `$$${fixedEnv}$$`;
  });

  // 8. Fix double backslashes before common LaTeX keywords using safe callback
  text = text.replace(/\\\\([a-zA-Z]+)/g, (_, g1) => "\\" + g1);

  // 9. Remove stray code backticks
  text = text.replace(/`([^`]+)`/g, (_, g1) => g1);

  // 10. Normalize common Unicode Math Symbols
  text = text.replace(/≥/g, "$\\ge$");
  text = text.replace(/≤/g, "$\\le$");
  text = text.replace(/±/g, "$\\pm$");
  text = text.replace(/×/g, "$\\times$");
  text = text.replace(/≠/g, "$\\neq$");
  text = text.replace(/≈/g, "$\\approx$");
  text = text.replace(/∞/g, "$\\infty$");
  text = text.replace(/Σ_\{([^}]*)\}\^\{([^}]*)\}/g, (_, g1, g2) => `$\\sum_{${g1}}^{${g2}}$`);
  text = text.replace(/Σ/g, "$\\Sigma$");

  // Convert roots: √6 -> $\sqrt{6}$, √(14) -> $\sqrt{14}$
  text = text.replace(/√(\d+)/g, (_, g1) => `$\\sqrt{${g1}}$`);
  text = text.replace(/√\(([^)]+)\)/g, (_, g1) => `$\\sqrt{${g1}}$`);

  // Convert degree notation: 30° -> $30^\circ$, 0°C -> $0^\circ\text{C}$
  text = text.replace(/(\d+)°\s*C\b/g, (_, g1) => `$${g1}^\\circ\\text{C}$`);
  text = text.replace(/(\d+)°/g, (_, g1) => `$${g1}^\\circ$`);

  // 11. Split by existing $ blocks so we only touch text outside math delimiters
  const parts = text.split("$");
  for (let i = 0; i < parts.length; i += 2) {
    let segment = parts[i];
    if (!segment) continue;

    // Standalone LaTeX commands
    segment = segment.replace(/(\\implies|\\iff|\\approx|\\neq|\\le|\\ge|\\pm|\\mp|\\times|\\cdot|\\infty|\\partial|\\rightarrow|\\leftarrow|\\to)/g, (_, g1) => `$${g1}$`);

    // Math styling commands: \mathbf{...}, \mathbb{...}, \mathrm{...}, \det(...), \operatorname{...}
    segment = segment.replace(/(\\mathbf\{[^}]+\})/g, (_, g1) => `$${g1}$`);
    segment = segment.replace(/(\\mathbb\{[^}]+\})/g, (_, g1) => `$${g1}$`);
    segment = segment.replace(/(\\det\([^)]+\))/g, (_, g1) => `$${g1}$`);
    segment = segment.replace(/(\\operatorname\{[^}]+\})/g, (_, g1) => `$${g1}$`);

    // Replace standalone fractions: \frac{a}{b} or -\frac{a}{b}
    segment = segment.replace(/(-?\\frac\{[^{}]*\}\{[^{}]*\})/g, (_, g1) => `$${g1}$`);
    // Replace standalone sqrt: \sqrt{a} or \sqrt[n]{a}
    segment = segment.replace(/(-?\\sqrt(?:\[[^\]]*\])?\{[^{}]*\})/g, (_, g1) => `$${g1}$`);
    // Replace standalone calculus/sums/limits: \int, \sum, \lim
    segment = segment.replace(/(\\int(?:_\{[^{}]*\}|_[0-9a-zA-Z])?(?:\^\{[^{}]*\}|\^[0-9a-zA-Z])?)/g, (_, g1) => `$${g1}$`);
    segment = segment.replace(/(\\sum(?:_\{[^{}]*\}|_[0-9a-zA-Z])?(?:\^\{[^{}]*\}|\^[0-9a-zA-Z])?)/g, (_, g1) => `$${g1}$`);
    segment = segment.replace(/(\\lim(?:_\{[^{}]*\}|_[0-9a-zA-Z])?)/g, (_, g1) => `$${g1}$`);
    // Replace functions: \ln, \log, \sin, \cos, \tan, \arctan
    segment = segment.replace(/(\\(?:ln|log|exp|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan)\b)/g, (_, g1) => `$${g1}$`);
    // Replace standalone greek symbols & operators
    segment = segment.replace(/(\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega|Delta|Gamma|Theta|Lambda|Sigma|Phi|Omega)\b)/g, (_, g1) => `$${g1}$`);

    // Physics vector hats: \hat{i}, \hat{j}, \hat{k}, \vec{a}, \vec{v}, \vec{F}
    segment = segment.replace(/(\\(?:hat|vec|dot|ddot)\{[a-zA-Z0-9]\})/g, (_, g1) => `$${g1}$`);

    // Clean stray \text{...} outside math mode
    segment = segment.replace(/\\text\{([^{}]+)\}/g, (_, g1) => g1);

    parts[i] = segment;
  }

  let res = parts.join("$");
  // Clean empty $$ and redundant delimiters
  res = res.replace(/\$\s*\$/g, "");
  res = res.replace(/\${3,}/g, "$$");
  return res;
}

export default function MathText({ content, className = "" }: MathTextProps) {
  if (!content) return null;

  const formatted = formatMathText(content);

  return (
    <div className={`math-content prose-sm inline-block ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
      >
        {formatted}
      </ReactMarkdown>
    </div>
  );
}
