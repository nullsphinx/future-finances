(() => {
  "use strict";

  const MAX_SCENARIOS = 3;
  const MAX_CUSTOM_ASSETS = 10;
  const SCENARIO_COLORS = ["#2f7569", "#dc9145", "#63839b"];
  const CUSTOM_PORTFOLIOS = {
    crypto: {
      kind: "crypto",
      portfolioId: "cryptoPortfolio",
      listId: "cryptoList",
      toggleId: "cryptoToggle",
      addButtonId: "addCoinButton",
      nameLabel: "Coin / token",
      placeholder: "e.g. BTC",
      suggestions: ["BTC", "ETH"],
      fallbackName: (sequence) => `Coin ${sequence}`,
      addLabel: "Add crypto",
      removeLabel: "Remove crypto",
      sequence: 0,
    },
    other: {
      kind: "other",
      portfolioId: "otherAssetsPortfolio",
      listId: "otherAssetsList",
      toggleId: "otherAssetsToggle",
      addButtonId: "addOtherAssetButton",
      nameLabel: "Asset name",
      placeholder: "e.g. Gold",
      suggestions: [],
      fallbackName: () => "",
      addLabel: "Add other assets",
      removeLabel: "Remove other assets",
      sequence: 0,
    },
  };
  const MARKET_ACCOUNTS = [
    {
      id: "brokerage",
      label: "Brokerage Account",
      balanceId: "brokerage",
      contributionId: "brokerageContribution",
    },
    {
      id: "roth",
      label: "Roth IRA",
      balanceId: "rothIra",
      contributionId: "rothIraContribution",
    },
    {
      id: "retirement",
      label: "401(k)",
      balanceId: "account401k",
      contributionId: "account401kContribution",
    },
  ];

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const numberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  });

  let lastProjection = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function readNumber(id) {
    const value = Number.parseFloat(byId(id).value);
    return Number.isFinite(value) ? value : 0;
  }

  function readElementNumber(input, fallback = 0) {
    if (!input.value.trim()) return fallback;
    const value = Number.parseFloat(input.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function formatCurrency(value) {
    return currencyFormatter.format(Math.round(value));
  }

  function formatCompactCurrency(value) {
    return compactCurrencyFormatter.format(value);
  }

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function formatRate(rate) {
    return `${(rate * 100).toFixed(1).replace(".0", "")}%`;
  }

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character]
    );
  }

  function createCustomAssetRow(type) {
    const config = CUSTOM_PORTFOLIOS[type];
    const list = byId(config.listId);
    if (list.children.length >= MAX_CUSTOM_ASSETS) return;

    config.sequence += 1;
    const sequence = config.sequence;
    const suggestedName =
      config.suggestions[sequence - 1] || config.fallbackName(sequence);
    const inputPrefix = `${type}-asset-${sequence}`;
    const row = document.createElement("div");
    row.className = "coin-row";
    row.dataset.assetId = String(sequence);
    row.innerHTML = `
      <label class="field" for="${inputPrefix}-name">
        <span>${config.nameLabel}</span>
        <input id="${inputPrefix}-name" class="asset-name" type="text" maxlength="30" value="${suggestedName}" placeholder="${config.placeholder}">
      </label>
      <label class="field" for="${inputPrefix}-balance">
        <span>Current balance</span>
        <span class="money-input"><span aria-hidden="true">$</span><input id="${inputPrefix}-balance" class="asset-balance" type="number" min="0" step="100" inputmode="decimal" placeholder="0"></span>
      </label>
      <label class="field" for="${inputPrefix}-contribution">
        <span>Yearly contribution</span>
        <span class="money-input"><span aria-hidden="true">$</span><input id="${inputPrefix}-contribution" class="asset-contribution" type="number" min="0" step="100" inputmode="decimal" placeholder="0"></span>
      </label>
      <label class="field" for="${inputPrefix}-rate">
        <span>Annual growth</span>
        <span class="suffix-input"><input id="${inputPrefix}-rate" class="asset-rate" type="number" min="-100" max="200" step="0.1" inputmode="decimal" placeholder="e.g. 5"><span>%</span></span>
      </label>
      <button class="remove-coin-button" type="button" aria-label="Remove ${suggestedName || "asset"}">×</button>
    `;

    row.querySelector(".remove-coin-button").addEventListener("click", () => {
      row.remove();
      syncCustomAssetControls(type);
    });
    row.querySelector(".asset-name").addEventListener("input", (event) => {
      const name = event.target.value.trim() || "asset";
      row.querySelector(".remove-coin-button").setAttribute(
        "aria-label",
        `Remove ${name}`
      );
    });

    list.appendChild(row);
    syncCustomAssetControls(type);
    row.querySelector(".asset-balance").focus();
  }

  function syncCustomAssetControls(type) {
    const config = CUSTOM_PORTFOLIOS[type];
    const list = byId(config.listId);
    const portfolio = byId(config.portfolioId);
    const toggle = byId(config.toggleId);
    const assetCount = list.children.length;

    byId(config.addButtonId).disabled = assetCount >= MAX_CUSTOM_ASSETS;

    if (assetCount === 0 && !portfolio.hidden) {
      portfolio.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.querySelector(".text-button__icon").textContent = "+";
      toggle.querySelector("span:last-child").textContent = config.addLabel;
    }
  }

  function getCustomAssets(type) {
    const config = CUSTOM_PORTFOLIOS[type];
    if (byId(config.portfolioId).hidden) return [];

    return Array.from(byId(config.listId).querySelectorAll(".coin-row")).map(
      (row) => {
        const balance = readElementNumber(row.querySelector(".asset-balance"));
        const contribution = readElementNumber(
          row.querySelector(".asset-contribution")
        );
        const rateInput = row.querySelector(".asset-rate");
        const rate = rateInput.value.trim()
          ? Number.parseFloat(rateInput.value) / 100
          : Number.NaN;

        return {
          id: `${type}-${row.dataset.assetId}`,
          kind: config.kind,
          label: row.querySelector(".asset-name").value.trim(),
          balance,
          contribution,
          rate,
          active: balance !== 0 || contribution !== 0,
        };
      }
    );
  }

  function getFormData() {
    const marketAccounts = MARKET_ACCOUNTS.map((account) => ({
      ...account,
      kind: "market",
      balance: readNumber(account.balanceId),
      contribution: readNumber(account.contributionId),
      rate: null,
    }));
    const cryptoAssets = getCustomAssets("crypto");
    const otherAssets = getCustomAssets("other");
    const customAssets = [...cryptoAssets, ...otherAssets];
    const rates = Array.from(
      document.querySelectorAll('input[name="growthRates"]:checked')
    )
      .map((input) => Number.parseFloat(input.value) / 100)
      .sort((a, b) => a - b);

    return {
      marketAccounts,
      cryptoAssets,
      otherAssets,
      customAssets,
      accounts: [
        ...marketAccounts,
        ...customAssets.filter((asset) => asset.active),
      ],
      currentAge: Number.parseInt(byId("currentAge").value, 10),
      targetAge: Number.parseInt(byId("targetAge").value, 10),
      displayIncrement: Number.parseInt(byId("displayIncrement").value, 10),
      contributionIncrease: readNumber("contributionIncrease") / 100,
      rates,
    };
  }

  function validate(data) {
    const errors = [];
    const hasInvestment = data.accounts.some(
      (account) => account.balance > 0 || account.contribution > 0
    );

    if (!hasInvestment) {
      errors.push("Add a balance or yearly contribution to at least one account.");
    }

    if (
      data.accounts.some(
        (account) => account.balance < 0 || account.contribution < 0
      )
    ) {
      errors.push("Account balances and contributions cannot be negative.");
    }

    const activeCustomAssets = data.customAssets.filter((asset) => asset.active);
    if (activeCustomAssets.some((asset) => !asset.label)) {
      errors.push("Give each custom asset a name.");
    }
    if (
      activeCustomAssets.some(
        (asset) =>
          !Number.isFinite(asset.rate) || asset.rate < -1 || asset.rate > 2
      )
    ) {
      errors.push(
        "Enter an annual growth rate between -100% and 200% for each custom asset."
      );
    }

    const customAssetNames = activeCustomAssets.map((asset) =>
      asset.label.toLowerCase()
    );
    if (new Set(customAssetNames).size !== customAssetNames.length) {
      errors.push("Use a unique name for each custom asset.");
    }

    if (!Number.isInteger(data.currentAge) || data.currentAge < 1 || data.currentAge > 119) {
      errors.push("Enter a current age between 1 and 119.");
    }
    if (!Number.isInteger(data.targetAge) || data.targetAge < 2 || data.targetAge > 120) {
      errors.push("Enter a target age between 2 and 120.");
    } else if (data.targetAge <= data.currentAge) {
      errors.push("Your target age must be greater than your current age.");
    }
    if (
      !Number.isInteger(data.displayIncrement) ||
      data.displayIncrement < 1 ||
      data.displayIncrement > 25
    ) {
      errors.push("The display interval must be between 1 and 25 years.");
    }
    if (
      data.contributionIncrease < 0 ||
      data.contributionIncrease > 0.25
    ) {
      errors.push("The yearly contribution increase must be between 0% and 25%.");
    }
    if (data.rates.length === 0) {
      errors.push("Select at least one stock-market growth rate.");
    } else if (data.rates.length > MAX_SCENARIOS) {
      errors.push(`Select no more than ${MAX_SCENARIOS} growth rates.`);
    }

    return errors;
  }

  function showErrors(errors) {
    const banner = byId("formError");
    banner.replaceChildren(
      ...errors.map((message) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = message;
        return paragraph;
      })
    );
    banner.hidden = false;
    banner.focus({ preventScroll: true });
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearErrors() {
    byId("formError").hidden = true;
    byId("formError").replaceChildren();
  }

  function projectScenario(data, marketRate) {
    const years = data.targetAge - data.currentAge;
    const states = data.accounts.map((account) => ({
      id: account.id,
      kind: account.kind,
      label: account.label,
      rate: account.kind === "market" ? marketRate : account.rate,
      value: account.balance,
      contribution: account.contribution,
    }));
    const points = [];

    for (let year = 0; year <= years; year += 1) {
      if (year > 0) {
        states.forEach((account) => {
          account.value =
            account.value * (1 + account.rate) + account.contribution;
          account.contribution *= 1 + data.contributionIncrease;
        });
      }

      const accounts = states.map((account) => ({
        id: account.id,
        label: account.label,
        value: account.value,
      }));
      points.push({
        year,
        age: data.currentAge + year,
        accounts,
        total: accounts.reduce((sum, account) => sum + account.value, 0),
      });
    }

    return { marketRate, points };
  }

  function getDisplayYears(data) {
    const totalYears = data.targetAge - data.currentAge;
    const years = [0];

    for (
      let year = data.displayIncrement;
      year < totalYears;
      year += data.displayIncrement
    ) {
      years.push(year);
    }
    if (!years.includes(totalYears)) years.push(totalYears);
    return years;
  }

  function tableAccountLabel(account) {
    if (account.kind !== "market") {
      return `${escapeHtml(account.label)} <span class="account-rate">(${formatRate(
        account.rate
      )})</span>`;
    }
    return escapeHtml(account.label);
  }

  function renderTable(data, scenarios) {
    const groupSize = data.accounts.length + 1;
    const displayYears = getDisplayYears(data);
    let html = '<table class="projection-table"><thead><tr>';
    html += '<th class="age-column" rowspan="2" scope="col">Age</th>';

    scenarios.forEach((scenario, scenarioIndex) => {
      html += `<th class="group-header scenario-${scenarioIndex} group-start" colspan="${groupSize}" scope="colgroup">${formatRate(
        scenario.marketRate
      )} Growth Rate</th>`;
    });
    html += "</tr><tr>";

    scenarios.forEach((scenario, scenarioIndex) => {
      data.accounts.forEach((account, accountIndex) => {
        html += `<th class="sub-header scenario-${scenarioIndex} ${
          accountIndex === 0 ? "group-start" : ""
        }" scope="col">${tableAccountLabel(account)}</th>`;
      });
      html += '<th class="sub-header total-cell" scope="col">Total</th>';
    });
    html += "</tr></thead><tbody>";

    displayYears.forEach((year) => {
      html += `<tr><th class="age-column" scope="row">${
        data.currentAge + year
      }</th>`;
      scenarios.forEach((scenario, scenarioIndex) => {
        const point = scenario.points[year];
        point.accounts.forEach((account, accountIndex) => {
          html += `<td class="scenario-${scenarioIndex} ${
            accountIndex === 0 ? "group-start" : ""
          }">${formatCurrency(account.value)}</td>`;
        });
        html += `<td class="total-cell">${formatCurrency(point.total)}</td>`;
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    byId("resultsTable").innerHTML = html;
    byId("resultsSubtitle").textContent = `Every ${data.displayIncrement} year${
      data.displayIncrement === 1 ? "" : "s"
    } · Age ${data.currentAge} to ${data.targetAge}`;
  }

  function niceMaximum(value) {
    if (value <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    const rounded =
      normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return rounded * magnitude;
  }

  function renderChart(data, scenarios) {
    const width = 800;
    const height = 320;
    const margin = { top: 16, right: 18, bottom: 34, left: 72 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const years = data.targetAge - data.currentAge;
    const highestValue = Math.max(
      ...scenarios.flatMap((scenario) =>
        scenario.points.map((point) => point.total)
      )
    );
    const yMaximum = niceMaximum(highestValue * 1.04);
    const xForYear = (year) => margin.left + (year / years) * plotWidth;
    const yForValue = (value) =>
      margin.top + plotHeight - (value / yMaximum) * plotHeight;
    let svg = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">`;

    for (let tick = 0; tick <= 4; tick += 1) {
      const value = (yMaximum / 4) * tick;
      const y = yForValue(value);
      svg += `<line class="chart-grid-line" x1="${margin.left}" y1="${y}" x2="${
        width - margin.right
      }" y2="${y}"></line>`;
      svg += `<text class="chart-axis-label" x="${
        margin.left - 10
      }" y="${y + 3}" text-anchor="end">${formatCompactCurrency(
        value
      )}</text>`;
    }

    const midpoint = Math.round(years / 2);
    [0, midpoint, years]
      .filter((year, index, values) => values.indexOf(year) === index)
      .forEach((year) => {
        svg += `<text class="chart-axis-label" x="${xForYear(
          year
        )}" y="${height - 9}" text-anchor="middle">Age ${
          data.currentAge + year
        }</text>`;
      });

    scenarios.forEach((scenario, index) => {
      const path = scenario.points
        .map((point, pointIndex) => {
          const command = pointIndex === 0 ? "M" : "L";
          return `${command}${xForYear(point.year).toFixed(2)},${yForValue(
            point.total
          ).toFixed(2)}`;
        })
        .join(" ");
      const target = scenario.points[scenario.points.length - 1];
      svg += `<path class="chart-path" d="${path}" stroke="${SCENARIO_COLORS[index]}"></path>`;
      svg += `<circle class="chart-endpoint" cx="${xForYear(
        years
      )}" cy="${yForValue(target.total)}" r="5" fill="${
        SCENARIO_COLORS[index]
      }"></circle>`;
    });

    svg += `<line class="chart-hover-guide" data-hover-guide x1="0" y1="${margin.top}" x2="0" y2="${
      margin.top + plotHeight
    }" opacity="0"></line>`;
    scenarios.forEach((scenario, index) => {
      svg += `<circle class="chart-hover-point" data-hover-point="${index}" cx="0" cy="0" r="5" fill="${SCENARIO_COLORS[index]}" opacity="0"></circle>`;
    });
    svg += `<rect class="chart-hit-area" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" tabindex="0" aria-label="Interactive projection chart. Use the left and right arrow keys to inspect each age."></rect>`;
    svg += "</svg>";

    const chart = byId("projectionChart");
    chart.innerHTML = svg;
    chart.setAttribute(
      "aria-label",
      `Portfolio growth from age ${data.currentAge} to ${data.targetAge} at ${scenarios
        .map((scenario) => formatRate(scenario.marketRate))
        .join(", ")} stock-market growth rates. Crypto and other custom assets use their individual growth rates.`
    );
    byId("chartLegend").innerHTML = scenarios
      .map(
        (scenario, index) => `
          <span class="legend-item">
            <span class="legend-item__line" style="background:${SCENARIO_COLORS[index]}"></span>
            ${formatRate(scenario.marketRate)} stocks
          </span>
        `
      )
      .join("");

    const svgElement = chart.querySelector("svg");
    const hitArea = chart.querySelector(".chart-hit-area");
    const guide = chart.querySelector("[data-hover-guide]");
    const hoverPoints = Array.from(
      chart.querySelectorAll("[data-hover-point]")
    );
    const tooltip = byId("chartTooltip");
    const panel = chart.closest(".chart-panel");
    let keyboardYear = 0;

    function showAtYear(year, clientX, clientY) {
      const boundedYear = Math.max(0, Math.min(years, year));
      const x = xForYear(boundedYear);
      guide.setAttribute("x1", String(x));
      guide.setAttribute("x2", String(x));
      guide.setAttribute("opacity", "1");

      hoverPoints.forEach((point, index) => {
        point.setAttribute("cx", String(x));
        point.setAttribute(
          "cy",
          String(yForValue(scenarios[index].points[boundedYear].total))
        );
        point.setAttribute("opacity", "1");
      });

      tooltip.innerHTML = `
        <strong>Age ${data.currentAge + boundedYear}</strong>
        ${scenarios
          .map(
            (scenario, index) => `
              <div class="chart-tooltip__row">
                <span class="chart-tooltip__label"><span class="chart-tooltip__dot" style="background:${SCENARIO_COLORS[index]}"></span>${formatRate(
              scenario.marketRate
            )}</span>
                <span>${formatCurrency(
                  scenario.points[boundedYear].total
                )}</span>
              </div>
            `
          )
          .join("")}
      `;
      tooltip.hidden = false;

      const svgRect = svgElement.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const anchorX =
        clientX ?? svgRect.left + (x / width) * svgRect.width;
      const anchorY = clientY ?? svgRect.top + 70;
      let left = anchorX - panelRect.left + 12;
      let top = anchorY - panelRect.top - tooltip.offsetHeight - 10;
      left = Math.min(
        Math.max(10, left),
        panel.clientWidth - tooltip.offsetWidth - 10
      );
      top = Math.max(10, top);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      keyboardYear = boundedYear;
    }

    function hideTooltip() {
      guide.setAttribute("opacity", "0");
      hoverPoints.forEach((point) => point.setAttribute("opacity", "0"));
      tooltip.hidden = true;
    }

    svgElement.addEventListener("pointermove", (event) => {
      const rect = svgElement.getBoundingClientRect();
      const svgX = ((event.clientX - rect.left) / rect.width) * width;
      const year = Math.round(
        ((Math.max(margin.left, Math.min(width - margin.right, svgX)) -
          margin.left) /
          plotWidth) *
          years
      );
      showAtYear(year, event.clientX, event.clientY);
    });
    svgElement.addEventListener("pointerleave", hideTooltip);
    hitArea.addEventListener("focus", () => showAtYear(keyboardYear));
    hitArea.addEventListener("blur", hideTooltip);
    hitArea.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      showAtYear(keyboardYear + (event.key === "ArrowRight" ? 1 : -1));
    });
  }

  function renderFormula(data, scenarios) {
    const container = byId("formulaExplanation");
    if (window.MathJax && typeof window.MathJax.typesetClear === "function") {
      window.MathJax.typesetClear([container]);
    }

    const scenario = scenarios[0];
    const years = data.targetAge - data.currentAge;
    const growth = data.contributionIncrease;
    const targetPoint = scenario.points[scenario.points.length - 1];
    const activeAccounts = data.accounts.filter(
      (account) => account.balance > 0 || account.contribution > 0
    );

    let html = `
      <h2 id="formulaTitle">Formula Explanation</h2>
      <div class="formula-card">
        \\[FV = P \\times (1 + r)^n + \\sum_{t=1}^{n} PMT_0 \\times (1 + g)^{t-1} \\times (1 + r)^{n-t}\\]
      </div>
      <ul class="variable-list">
        <li><strong>FV:</strong> Final value of the account</li>
        <li><strong>P:</strong> Principal investment</li>
        <li><strong>r:</strong> Annual growth rate</li>
        <li><strong>n:</strong> Number of years</li>
        <li><strong>PMT<sub>0</sub>:</strong> Initial yearly contribution</li>
        <li><strong>g:</strong> Annual increase rate of contributions</li>
        <li><strong>t:</strong> Each individual year from 1 to n</li>
      </ul>
    `;

    activeAccounts.forEach((account) => {
      const accountRate =
        account.kind === "market" ? scenario.marketRate : account.rate;
      const result = targetPoint.accounts.find(
        (projectedAccount) => projectedAccount.id === account.id
      );
      const safeLabel = escapeHtml(account.label);
      html += `
        <section class="formula-example-section">
          <h3>Example Calculation — ${safeLabel}</h3>
          <div class="example-copy">
            For an initial investment of \\(P = ${formatNumber(
              account.balance
            )}\\), annual contribution of \\(PMT_0 = ${formatNumber(
        account.contribution
      )}\\), growth rate of \\(r = ${formatNumber(
        accountRate
      )}\\), annual contribution increase rate of \\(g = ${formatNumber(
        growth
      )}\\), and a time span of \\(n = ${years}\\) years:
          </div>
          <div class="formula-card formula-example">
            \\[FV = ${formatNumber(account.balance)} \\times (1 + ${formatNumber(
        accountRate
      )})^{${years}} + \\sum_{t=1}^{${years}} ${formatNumber(
        account.contribution
      )} \\times (1 + ${formatNumber(
        growth
      )})^{t-1} \\times (1 + ${formatNumber(
        accountRate
      )})^{${years}-t}\\]
          </div>
          <div class="example-result">After ${years} years your final value <strong>(FV) = ${formatCurrency(
        result.value
      )}</strong></div>
        </section>
      `;
    });

    html += `
      <p class="formula-disclaimer">
        Educational estimate only. This calculator does not include taxes, fees, contribution limits, withdrawals, or market volatility and is not financial advice.
      </p>
    `;
    container.innerHTML = html;

    const typeset = () => {
      if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise([container]).catch(() => {});
      }
    };
    typeset();
    if (!window.MathJax || typeof window.MathJax.typesetPromise !== "function") {
      window.addEventListener("load", typeset, { once: true });
    }
  }

  function renderResults(data, scenarios) {
    renderTable(data, scenarios);
    renderChart(data, scenarios);
    renderFormula(data, scenarios);
    const results = byId("resultsSection");
    results.hidden = false;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    results.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearErrors();
    const data = getFormData();
    const errors = validate(data);

    if (errors.length) {
      showErrors(errors);
      return;
    }

    const scenarios = data.rates.map((rate) => projectScenario(data, rate));
    lastProjection = { data, scenarios };
    renderResults(data, scenarios);
  }

  function csvEscape(value) {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function handleDownload() {
    if (!lastProjection) return;
    const { data, scenarios } = lastProjection;
    const headers = ["Age"];

    scenarios.forEach((scenario) => {
      data.accounts.forEach((account) => {
        headers.push(
          `${formatRate(scenario.marketRate)} stocks — ${account.label}`
        );
      });
      headers.push(`${formatRate(scenario.marketRate)} stocks — Total`);
    });

    const rows = [headers];
    getDisplayYears(data).forEach((year) => {
      const row = [data.currentAge + year];
      scenarios.forEach((scenario) => {
        const point = scenario.points[year];
        point.accounts.forEach((account) => row.push(Math.round(account.value)));
        row.push(Math.round(point.total));
      });
      rows.push(row);
    });

    const csv = rows
      .map((row) => row.map((value) => csvEscape(value)).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "future-finances-projection.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toggleCustomPortfolio(type) {
    const config = CUSTOM_PORTFOLIOS[type];
    const portfolio = byId(config.portfolioId);
    const toggle = byId(config.toggleId);
    const willShow = portfolio.hidden;

    portfolio.hidden = !willShow;
    toggle.setAttribute("aria-expanded", String(willShow));
    toggle.querySelector(".text-button__icon").textContent = willShow ? "−" : "+";
    toggle.querySelector("span:last-child").textContent = willShow
      ? config.removeLabel
      : config.addLabel;

    if (willShow && byId(config.listId).children.length === 0) {
      createCustomAssetRow(type);
    }
  }

  function enforceScenarioLimit() {
    const checkboxes = Array.from(
      document.querySelectorAll('input[name="growthRates"]')
    );
    const selectedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
    const atLimit = selectedCount >= MAX_SCENARIOS;

    checkboxes.forEach((checkbox) => {
      const disabled = atLimit && !checkbox.checked;
      checkbox.disabled = disabled;
      checkbox.closest(".rate-card").classList.toggle("is-disabled", disabled);
    });
  }

  function init() {
    byId("financeForm").addEventListener("submit", handleSubmit);
    byId("downloadButton").addEventListener("click", handleDownload);
    byId("cryptoToggle").addEventListener("click", () =>
      toggleCustomPortfolio("crypto")
    );
    byId("otherAssetsToggle").addEventListener("click", () =>
      toggleCustomPortfolio("other")
    );
    byId("addCoinButton").addEventListener("click", () =>
      createCustomAssetRow("crypto")
    );
    byId("addOtherAssetButton").addEventListener("click", () =>
      createCustomAssetRow("other")
    );
    document
      .querySelectorAll('input[name="growthRates"]')
      .forEach((checkbox) =>
        checkbox.addEventListener("change", enforceScenarioLimit)
      );
    enforceScenarioLimit();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
