/*
 * Cross-country regression of website visitors on country characteristics,
 * drawn under the visitor map on the contact page.
 *
 *   ln(visitors_i) = alpha + beta_1 * x_1i + ... + beta_k * x_ki + e_i
 *
 * where each x is ln(regressor) for regressors marked `log: true`.
 * Estimated by OLS with heteroskedasticity-robust (HC1) standard errors.
 * Countries with no visitors drop out (ln 0 is undefined).
 *
 * The dependent variable comes from _data/visitors.json (updated twice a day
 * by the "Update visitor map" GitHub Action). Regressors are computed here
 * (distance) or read from _data/country_covariates.json (World Bank data,
 * updated monthly by the "Update country data" GitHub Action).
 *
 * With several regressors, the chart shows the relationship for the variable
 * chosen in the menu, holding the others constant (Frisch-Waugh-Lovell: both
 * axes are residualized on the other regressors, then the sample means are
 * added back, so the slope of the line is exactly that coefficient).
 *
 * To add a regressor, add an entry to REGRESSORS below.
 */
(function () {
  'use strict';

  var EARTH_RADIUS_KM = 6371;
  var HOME_ID = '250';               /* France (ISO 3166 numeric code) */
  var HOME_DISTANCE_KM = 1;          /* distance used for France itself, so ln(distance) exists */
  var EXCLUDED_IDS = { '010': true }; /* Antarctica */
  /* Three-letter codes for places the World Bank does not list. */
  var ISO3_FALLBACK = { TW: 'TWN' };

  /*
   * Each regressor:
   *   key        short identifier
   *   label      name in the results table
   *   axis       axis title (raw units)
   *   log        true: enters the model as ln(value)
   *   format     formats a raw value for the tooltip
   *   value      function (country, home) -> raw number, or null if missing.
   *              `country` has: id (ISO numeric), code (ISO 2 letters), iso3,
   *              name, visitors, centroid [lon, lat], isHome, covariates (its
   *              row of country_covariates.json, or null).
   */
  var REGRESSORS = [
    {
      key: 'distance',
      label: 'Distance to France',
      axis: 'Distance to France (km, log scale)',
      log: true,
      format: function (v) { return Math.round(v).toLocaleString('en-GB') + ' km'; },
      value: function (c, home) {
        if (c.isHome) { return HOME_DISTANCE_KM; }
        return d3.geoDistance(c.centroid, home.centroid) * EARTH_RADIUS_KM;
      }
    },
    {
      key: 'gdp_pc',
      label: 'GDP per capita',
      axis: 'GDP per capita (PPP, international $, log scale)',
      log: true,
      format: function (v, c) {
        return '$' + Math.round(v).toLocaleString('en-GB') +
          (c && c.covariates && c.covariates.gdp_pc_year ? ' (' + c.covariates.gdp_pc_year + ')' : '');
      },
      value: function (c) { return c.covariates ? c.covariates.gdp_pc : null; }
    }
  ];

  var BLUE = '#2171b5';

  function termName(r) { return r.log ? 'ln(' + r.label + ')' : r.label; }

  function stars(p) {
    if (!isFinite(p)) { return ''; }
    return p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '';
  }

  /* ------------------------------------------------------------------ */
  /* Data                                                               */
  /* ------------------------------------------------------------------ */

  /* One row per country of the map, using its main landmass. */
  function buildCountries(features, covariates) {
    var rowsByCode = (covariates && covariates.countries) || {};
    var byKey = {};
    features.forEach(function (f) {
      var id = f.id || null;
      if (id && EXCLUDED_IDS[id]) { return; }
      if (!id && !f.visitors) { return; }
      var key = id || 'name:' + f.properties.name;
      var prev = byKey[key];
      if (prev && prev.size >= f.size) { return; }
      byKey[key] = f;
    });
    return Object.keys(byKey).map(function (key) {
      var f = byKey[key];
      var code = f.visitors ? f.visitors.code : null;
      var cov = (code && rowsByCode[code]) || null;
      return {
        id: f.id || null,
        code: code,
        iso3: (cov && cov.iso3) || ISO3_FALLBACK[code] || code || '',
        name: f.visitors ? f.visitors.name : f.properties.name,
        visitors: f.visitors ? f.visitors.count : 0,
        centroid: d3.geoCentroid(f.main),
        covariates: cov,
        isHome: f.id === HOME_ID
      };
    });
  }

  function usable(r, v) {
    return v !== null && v !== undefined && isFinite(v) && (!r.log || v > 0);
  }

  /* Estimation sample: countries with at least one visitor and every regressor.
     Returns the rows, and the visited countries left out for missing data. */
  function sample(countries, home, regs) {
    var rows = [], dropped = [];
    countries.forEach(function (c) {
      if (!(c.visitors > 0)) { return; }
      var raw = regs.map(function (r) { return r.value(c, home); });
      if (!raw.every(function (v, j) { return usable(regs[j], v); })) {
        dropped.push(c.name);
        return;
      }
      rows.push({
        country: c,
        visitors: c.visitors,
        y: Math.log(c.visitors),
        raw: raw,
        x: raw.map(function (v, j) { return regs[j].log ? Math.log(v) : v; })
      });
    });
    return { rows: rows, dropped: dropped };
  }

  function sd(values) {
    var m = d3.mean(values);
    return Math.sqrt(d3.sum(values, function (v) { return (v - m) * (v - m); }) / (values.length - 1));
  }

  /* ------------------------------------------------------------------ */
  /* Statistics                                                         */
  /* ------------------------------------------------------------------ */

  function invert(A) {
    var n = A.length;
    var M = A.map(function (row, i) {
      return row.concat(row.map(function (_, j) { return i === j ? 1 : 0; }));
    });
    for (var col = 0; col < n; col++) {
      var pivot = col;
      for (var r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) { pivot = r; }
      }
      if (Math.abs(M[pivot][col]) < 1e-12) { return null; }
      var tmp = M[col]; M[col] = M[pivot]; M[pivot] = tmp;
      var d = M[col][col];
      for (var j = 0; j < 2 * n; j++) { M[col][j] /= d; }
      for (r = 0; r < n; r++) {
        if (r === col) { continue; }
        var f = M[r][col];
        if (f === 0) { continue; }
        for (j = 0; j < 2 * n; j++) { M[r][j] -= f * M[col][j]; }
      }
    }
    return M.map(function (row) { return row.slice(n); });
  }

  /* OLS of y on X (X already contains the constant column). */
  function ols(X, y) {
    var n = X.length;
    var k = X[0].length;
    if (n <= k) { return null; }
    var XtX = [], Xty = [];
    var i, a, b;
    for (a = 0; a < k; a++) {
      XtX.push(new Array(k).fill(0));
      Xty.push(0);
    }
    for (i = 0; i < n; i++) {
      for (a = 0; a < k; a++) {
        Xty[a] += X[i][a] * y[i];
        for (b = 0; b < k; b++) { XtX[a][b] += X[i][a] * X[i][b]; }
      }
    }
    var XtXi = invert(XtX);
    if (!XtXi) { return null; }
    var beta = XtXi.map(function (row) {
      return row.reduce(function (s, v, j) { return s + v * Xty[j]; }, 0);
    });
    var fitted = X.map(function (row) {
      return row.reduce(function (s, v, j) { return s + v * beta[j]; }, 0);
    });
    var resid = y.map(function (v, i2) { return v - fitted[i2]; });
    var ybar = d3.mean(y);
    var ssr = d3.sum(resid, function (e) { return e * e; });
    var tss = d3.sum(y, function (v) { return (v - ybar) * (v - ybar); });
    var df = n - k;

    /* HC1 sandwich: n/(n-k) (X'X)^-1 [sum e_i^2 x_i x_i'] (X'X)^-1 */
    var meat = [];
    for (a = 0; a < k; a++) { meat.push(new Array(k).fill(0)); }
    for (i = 0; i < n; i++) {
      var e2 = resid[i] * resid[i];
      for (a = 0; a < k; a++) {
        for (b = 0; b < k; b++) { meat[a][b] += e2 * X[i][a] * X[i][b]; }
      }
    }
    var V = matmul(matmul(XtXi, meat), XtXi).map(function (row) {
      return row.map(function (v) { return v * n / df; });
    });

    var tcrit = tQuantile(0.975, df);
    var coefs = beta.map(function (bj, j) {
      var se = Math.sqrt(Math.max(V[j][j], 0));
      var t = se > 0 ? bj / se : NaN;
      return {
        b: bj,
        se: se,
        t: t,
        p: isFinite(t) ? tTwoSidedP(t, df) : NaN,
        lo: bj - tcrit * se,
        hi: bj + tcrit * se
      };
    });

    return {
      n: n,
      k: k,
      df: df,
      beta: beta,
      V: V,
      coefs: coefs,
      fitted: fitted,
      resid: resid,
      tcrit: tcrit,
      r2: tss > 0 ? 1 - ssr / tss : NaN,
      adjR2: tss > 0 ? 1 - (ssr / df) / (tss / (n - 1)) : NaN
    };
  }

  function matmul(A, B) {
    return A.map(function (row) {
      return B[0].map(function (_, j) {
        return row.reduce(function (s, v, m) { return s + v * B[m][j]; }, 0);
      });
    });
  }

  /* Student t distribution via the regularized incomplete beta function. */
  function logGamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) { ser += c[j] / ++y; }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  function betaContinuedFraction(x, a, b) {
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) { d = 1e-30; }
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= 200; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) { d = 1e-30; }
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) { c = 1e-30; }
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) { d = 1e-30; }
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) { c = 1e-30; }
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-14) { break; }
    }
    return h;
  }

  function incompleteBeta(x, a, b) {
    if (x <= 0) { return 0; }
    if (x >= 1) { return 1; }
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) +
      a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) { return bt * betaContinuedFraction(x, a, b) / a; }
    return 1 - bt * betaContinuedFraction(1 - x, b, a) / b;
  }

  function tTwoSidedP(t, df) {
    return incompleteBeta(df / (df + t * t), df / 2, 0.5);
  }

  function tQuantile(prob, df) {
    /* Bisection on the CDF: plenty accurate for a confidence band. */
    var lo = 0, hi = 1000;
    for (var i = 0; i < 100; i++) {
      var mid = (lo + hi) / 2;
      var cdf = 1 - tTwoSidedP(mid, df) / 2;
      if (cdf < prob) { lo = mid; } else { hi = mid; }
    }
    return (lo + hi) / 2;
  }

  /* Residuals of v on the columns of Z (Frisch–Waugh–Lovell). */
  function residualize(v, Z) {
    var fit = ols(Z, v);
    return fit ? fit.resid : null;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                          */
  /* ------------------------------------------------------------------ */

  var MINUS = '−';
  function sign(text) { return text.replace('-', MINUS); }
  function fmtNum(v, spec) { return isFinite(v) ? sign(d3.format(spec)(v)) : '–'; }
  function fmtP(p) { return !isFinite(p) ? '–' : p < 0.001 ? '< 0.001' : d3.format('.3f')(p); }

  function render(opts) {
    var root = d3.select(opts.container);
    if (root.empty()) { return; }
    var countries = buildCountries(opts.features, opts.covariates);
    var home = countries.filter(function (c) { return c.isHome; })[0];
    if (!home) { root.style('display', 'none'); return; }

    /* Regressors with data (e.g. GDP only once country_covariates.json exists). */
    var regs = REGRESSORS.filter(function (r) {
      return countries.some(function (c) { return c.visitors > 0 && usable(r, r.value(c, home)); });
    });
    if (!regs.length) { root.style('display', 'none'); return; }

    var state = { focus: 0 };

    root.html('');
    if (regs.length > 1) {
      var controls = root.append('div').attr('class', 'vreg-controls');
      var lab = controls.append('label');
      lab.append('span').text('Explanatory variable shown:');
      var select = lab.append('select').attr('aria-label', 'Explanatory variable to display')
        .on('change', function () {
          state.focus = +this.value;
          update();
        });
      select.selectAll('option').data(regs).join('option')
        .attr('value', function (_, j) { return j; })
        .text(function (r) { return r.label; });
    }
    var chartBox = root.append('div').attr('class', 'vreg-chart');
    var tip = chartBox.append('div').attr('class', 'vreg-tip').attr('hidden', true);
    var equation = root.append('p').attr('class', 'vreg-equation');
    var table = root.append('div').attr('class', 'vreg-scroll').append('table').attr('class', 'vreg-table');
    var note = root.append('p').attr('class', 'vreg-note');

    var lastWidth = 0;
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (Math.abs(opts.container.clientWidth - lastWidth) < 4) { return; }
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(update, 200);
    });

    /* Estimate once: the data only change when the page is rebuilt. */
    var s = sample(countries, home, regs);
    var rows = s.rows;
    var X = rows.map(function (r) { return [1].concat(r.x); });
    var y = rows.map(function (r) { return r.y; });
    var fit = rows.length ? ols(X, y) : null;
    if (fit) {
      /* Standardized coefficients: beta_j * sd(x_j) / sd(y), in the estimation sample. */
      var sdY = sd(y);
      fit.std = regs.map(function (_, j) {
        return fit.beta[j + 1] * sd(rows.map(function (r) { return r.x[j]; })) / sdY;
      });
      /* Kept so the estimates can be inspected from the browser console. */
      window.VisitorRegression.last = {
        variables: regs.map(function (r) { return r.key; }),
        sample: rows.map(function (r) {
          return { country: r.country.name, iso3: r.country.iso3, visitors: r.visitors, x: r.raw };
        }),
        dropped: s.dropped,
        fit: fit
      };
    }

    update();

    function update() {
      lastWidth = opts.container.clientWidth;
      chartBox.selectAll('svg').remove();
      tip.attr('hidden', true);
      if (!fit) {
        equation.text('Not enough countries yet to estimate the model.');
        table.html('');
        note.text('');
        return;
      }
      drawChart();
      writeResults();
    }

    function drawChart() {
      var j = state.focus;
      var reg = regs[j];
      var others = regs.filter(function (_, m) { return m !== j; });
      var meanX = regs.map(function (_, m) { return d3.mean(rows, function (r) { return r.x[m]; }); });
      var meanY = d3.mean(y);

      /* Frisch-Waugh-Lovell with means added back (as in binscatter with controls):
         with no other regressor this is just the raw data. */
      var Z = rows.map(function (r) {
        return [1].concat(r.x.filter(function (_, m) { return m !== j; }));
      });
      var ex = residualize(rows.map(function (r) { return r.x[j]; }), Z);
      var ey = residualize(y, Z);
      var points = rows.map(function (r, i) {
        var lx = ex[i] + meanX[j];
        var ly = ey[i] + meanY;
        return {
          row: r,
          x: reg.log ? Math.exp(lx) : lx,
          y: Math.exp(ly),
          fitted: fit.fitted[i]
        };
      });

      var W = Math.max(280, opts.container.clientWidth);
      var narrow = W < 560;
      /* Taller on phones, so that every country code fits. */
      var H = narrow ? Math.round(Math.min(560, W * 1.35)) : Math.round(Math.max(300, Math.min(460, W * 0.6)));
      var m = { top: 14, right: 18, bottom: 46, left: 50 };

      var xExt = d3.extent(points, function (p) { return p.x; });
      var yExt = d3.extent(points, function (p) { return p.y; });
      var x = reg.log ? d3.scaleLog().domain([xExt[0] / 1.6, xExt[1] * 1.6])
        : d3.scaleLinear().domain(xExt).nice();
      var yScale = d3.scaleLog().domain([yExt[0] / 1.5, yExt[1] * 1.6]);
      x.range([m.left, W - m.right]);
      yScale.range([H - m.bottom, m.top]);
      var yS = yScale;

      function logTicks(scale) {
        var d = scale.domain();
        var lo = Math.floor(Math.log10(d[0])), hi = Math.ceil(Math.log10(d[1]));
        var steps = hi - lo > 3 ? [1] : [1, 2, 5];
        var out = [];
        for (var e = lo; e <= hi; e++) {
          steps.forEach(function (st) {
            var v = st * Math.pow(10, e);
            if (v >= d[0] && v <= d[1]) { out.push(v); }
          });
        }
        return out;
      }
      var xTicks = reg.log ? logTicks(x) : x.ticks(W < 500 ? 4 : 7);
      var yTicks = logTicks(yS);
      var fmtTick = d3.format(',~r');
      var xFmt = reg.log ? function (v) {
        return v >= 1e6 ? fmtTick(v / 1e6) + 'M' : v >= 1e3 && reg.key === 'gdp_pc' ? fmtTick(v / 1e3) + 'k' : fmtTick(v);
      } : function (v) { return sign(d3.format(',.1~f')(v)); };

      var adjusted = others.length > 0;
      var svg = chartBox.insert('svg', '.vreg-tip')
        .attr('width', W).attr('height', H)
        .attr('viewBox', [0, 0, W, H])
        .attr('role', 'img')
        .attr('aria-label', 'Scatter plot of visitors against ' + reg.label +
          (adjusted ? ', holding the other variables constant,' : '') +
          ' on log scales, with the fitted regression line');

      /* Result box for the variable shown: standardized beta with stars, robust t. */
      var c = fit.coefs[j + 1];
      var boxLines = [
        { text: termName(reg), cls: 'vreg-annot-var' },
        { text: 'Standardized β = ' + fmtNum(fit.std[j], '.2f') + stars(c.p), cls: 'vreg-annot-main' },
        { text: 't = ' + fmtNum(c.t, '.2f') + '  (robust SE)', cls: '' },
        { text: 'N = ' + fit.n + ' · R² = ' + d3.format('.2f')(fit.r2), cls: '' }
      ];
      var annot = svg.append('g').attr('class', 'vreg-annot');
      var bg = annot.append('rect').attr('rx', 4);
      annot.selectAll('text').data(boxLines).join('text')
        .attr('class', function (d) { return d.cls; })
        .attr('x', 0).attr('y', function (_, i) { return i * 16; })
        .text(function (d) { return d.text; });
      var bbox = annot.node().getBBox();
      var pad = 8;
      var bw = bbox.width + 2 * pad, bh = bbox.height + 2 * pad;
      /* Put the box in a corner free of points; failing that, above the plot. */
      var corners = [
        [W - m.right - bw - 6, m.top + 6],
        [m.left + 10, H - m.bottom - bh - 6],
        [W - m.right - bw - 6, H - m.bottom - bh - 6],
        [m.left + 10, m.top + 6]
      ];
      var box = corners.map(function (cn) {
        var covered = points.filter(function (p) {
          var px = x(p.x), py = yS(p.y);
          return px > cn[0] - 30 && px < cn[0] + bw + 30 && py > cn[1] - 14 && py < cn[1] + bh + 14;
        }).length;
        return { x: cn[0], y: cn[1], width: bw, height: bh, covered: covered };
      }).reduce(function (best, b) { return b.covered < best.covered ? b : best; });
      if (box.covered > 0) {
        var extra = bh + 8;
        H += extra;
        m.top += extra;
        yS.range([H - m.bottom, m.top]);
        svg.attr('height', H).attr('viewBox', [0, 0, W, H]);
        box = { x: W - m.right - bw, y: 4, width: bw, height: bh };
      }
      annot.attr('transform', 'translate(' + (box.x + pad - bbox.x) + ',' + (box.y + pad - bbox.y) + ')');
      bg.attr('x', bbox.x - pad).attr('y', bbox.y - pad).attr('width', bw).attr('height', bh);

      /* Grid and axes, kept quiet. */
      svg.append('g').attr('class', 'vreg-grid')
        .attr('transform', 'translate(' + m.left + ',0)')
        .call(d3.axisLeft(yS).tickValues(yTicks).tickSize(-(W - m.left - m.right)).tickFormat(''))
        .call(function (g) { g.select('.domain').remove(); });
      svg.append('g').attr('class', 'vreg-axis')
        .attr('transform', 'translate(0,' + (H - m.bottom) + ')')
        .call(d3.axisBottom(x).tickValues(xTicks).tickSizeOuter(0).tickFormat(xFmt));
      svg.append('g').attr('class', 'vreg-axis')
        .attr('transform', 'translate(' + m.left + ',0)')
        .call(d3.axisLeft(yS).tickValues(yTicks).tickSizeOuter(0).tickFormat(fmtTick))
        .call(function (g) { g.select('.domain').remove(); });
      svg.append('text').attr('class', 'vreg-axis-title')
        .attr('x', (m.left + W - m.right) / 2).attr('y', H - 8).attr('text-anchor', 'middle')
        .text(reg.axis + (adjusted ? ', adjusted' : ''));
      svg.append('text').attr('class', 'vreg-axis-title')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(m.top + H - m.bottom) / 2).attr('y', 13).attr('text-anchor', 'middle')
        .text(adjusted ? 'Visitors (log scale), adjusted' : 'Visitors (log scale)');

      /* Fitted line at the sample means of the other regressors, with the 95%
         confidence band of that prediction (robust covariance matrix). */
      var plot = svg.append('g');
      plot.append('clipPath').attr('id', 'vreg-clip').append('rect')
        .attr('x', m.left).attr('y', m.top)
        .attr('width', W - m.left - m.right).attr('height', H - m.top - m.bottom);
      var clipped = plot.append('g').attr('clip-path', 'url(#vreg-clip)');
      var d0 = x.domain();
      var grid = d3.range(0, 81).map(function (st) {
        return reg.log ? d0[0] * Math.pow(d0[1] / d0[0], st / 80) : d0[0] + st / 80 * (d0[1] - d0[0]);
      });
      var band = grid.map(function (xv) {
        var cvec = [1].concat(meanX.slice());
        cvec[j + 1] = reg.log ? Math.log(xv) : xv;
        var yhat = d3.sum(cvec, function (v, a) { return v * fit.beta[a]; });
        var vv = 0;
        for (var a = 0; a < cvec.length; a++) {
          for (var b = 0; b < cvec.length; b++) { vv += cvec[a] * fit.V[a][b] * cvec[b]; }
        }
        var se = Math.sqrt(Math.max(vv, 0));
        return [xv, Math.exp(yhat - fit.tcrit * se), Math.exp(yhat + fit.tcrit * se), Math.exp(yhat)];
      });
      clipped.append('path').attr('class', 'vreg-band')
        .attr('d', d3.area()
          .x(function (d) { return x(d[0]); })
          .y0(function (d) { return yS(d[1]); })
          .y1(function (d) { return yS(d[2]); })(band));
      clipped.append('path').attr('class', 'vreg-line')
        .attr('d', d3.line()
          .x(function (d) { return x(d[0]); })
          .y(function (d) { return yS(d[3]); })(band));

      /* Points. */
      var ordered = points.slice().sort(function (p, q) { return p.y - q.y; });
      var dots = svg.append('g');
      dots.selectAll('circle').data(ordered).join('circle')
        .attr('class', 'vreg-dot')
        .attr('cx', function (p) { return x(p.x); })
        .attr('cy', function (p) { return yS(p.y); })
        .attr('r', 4)
        .attr('fill', BLUE);

      /* Three-letter code next to every dot: each label takes the position around
         its dot that overlaps least with the other labels, the dots and the box. */
      var labels = svg.append('g').attr('class', 'vreg-labels' + (narrow ? ' vreg-labels-small' : ''));
      var placed = [];
      var dotBoxes = points.map(function (p) {
        return { x: x(p.x) - 4, y: yS(p.y) - 4, width: 8, height: 8, p: p };
      });
      var boxRect = { x: box.x, y: box.y, width: box.width, height: box.height };
      var spots = [
        [6, 3.5, 'start'], [-6, 3.5, 'end'], [0, -7, 'middle'], [0, 13, 'middle'],
        [5, -4, 'start'], [-5, -4, 'end'], [5, 11, 'start'], [-5, 11, 'end'],
        [11, 3.5, 'start'], [-11, 3.5, 'end'], [0, -14, 'middle'], [0, 20, 'middle'],
        [8, -11, 'start'], [-8, -11, 'end'], [8, 18, 'start'], [-8, 18, 'end']
      ];
      function overlapArea(a, b) {
        var w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        var h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        return w > 0 && h > 0 ? w * h : 0;
      }
      /* Crowded points first, so they get the free spots. */
      var crowd = points.map(function (p) {
        return points.filter(function (q) {
          return Math.abs(x(q.x) - x(p.x)) < 30 && Math.abs(yS(q.y) - yS(p.y)) < 16;
        }).length;
      });
      points.map(function (p, i) { return i; })
        .sort(function (a, b) { return crowd[b] - crowd[a]; })
        .forEach(function (i) {
          var p = points[i];
          var px = x(p.x), py = yS(p.y);
          var t = labels.append('text').text(p.row.country.iso3);
          var best = null;
          spots.forEach(function (sp, k) {
            t.attr('x', px + sp[0]).attr('y', py + sp[1]).attr('text-anchor', sp[2]);
            var bb = t.node().getBBox();
            var r = { x: bb.x - 1, y: bb.y, width: bb.width + 2, height: bb.height };
            var score = k * 0.5;
            placed.forEach(function (o) { score += 10 * overlapArea(r, o); });
            dotBoxes.forEach(function (o) { if (o.p !== p) { score += 2 * overlapArea(r, o); } });
            score += 4 * overlapArea(r, boxRect);
            if (r.x < m.left || r.x + r.width > W - m.right + 14 || r.y < m.top - 10 || r.y + r.height > H - m.bottom) {
              score += 1000;
            }
            if (!best || score < best.score) { best = { score: score, sp: sp, r: r }; }
          });
          t.attr('x', px + best.sp[0]).attr('y', py + best.sp[1]).attr('text-anchor', best.sp[2]);
          placed.push(best.r);
        });

      /* Hover / tap targets bigger than the dots. */
      svg.append('g').selectAll('circle').data(ordered).join('circle')
        .attr('cx', function (p) { return x(p.x); })
        .attr('cy', function (p) { return yS(p.y); })
        .attr('r', 10)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter click', function (event, p) {
          dots.selectAll('circle').attr('r', function (q) { return q === p ? 6 : 4; });
          var ctry = p.row.country;
          var lines = regs.map(function (r, k) {
            return r.label + ': ' + r.format(p.row.raw[k], ctry) +
              (r.key === 'distance' && ctry.isHome ? ' (by convention)' : '');
          });
          lines.push('Visitors: ' + ctry.visitors.toLocaleString('en-GB'));
          lines.push('Fitted: ' + d3.format(',.1f')(Math.exp(p.fitted)));
          tip.html('').attr('hidden', null);
          tip.append('strong').text(ctry.name + ' (' + ctry.iso3 + ')');
          lines.forEach(function (l) { tip.append('div').text(l); });
          tip.style('left', x(p.x) + 'px').style('top', yS(p.y) + 'px');
        })
        .on('mouseleave', function () {
          dots.selectAll('circle').attr('r', 4);
          tip.attr('hidden', true);
        });

      annot.raise();
    }

    function writeResults() {
      var terms = regs.map(function (r, j) {
        var b = fit.beta[j + 1];
        return (b < 0 ? ' ' + MINUS + ' ' : ' + ') + d3.format(',.3f')(Math.abs(b)) + ' × ' + termName(r);
      });
      equation.text('ln(Visitors) = ' + fmtNum(fit.beta[0], ',.3f') + terms.join(''));

      table.html('');
      var head = table.append('thead').append('tr');
      ['', 'Coefficient', 'Standardized β', 'Robust SE', 't', 'p-value', '95% CI'].forEach(function (h) {
        head.append('th').text(h);
      });
      var body = table.append('tbody');
      var names = ['Constant'].concat(regs.map(termName));
      fit.coefs.forEach(function (c, j) {
        var tr = body.append('tr');
        tr.append('th').attr('scope', 'row').text(names[j]);
        tr.append('td').text(fmtNum(c.b, ',.3f') + stars(c.p));
        tr.append('td').text(j === 0 ? '' : fmtNum(fit.std[j - 1], '.3f'));
        tr.append('td').text(fmtNum(c.se, ',.3f'));
        tr.append('td').text(fmtNum(c.t, '.2f'));
        tr.append('td').text(fmtP(c.p));
        tr.append('td').text('[' + fmtNum(c.lo, ',.3f') + ', ' + fmtNum(c.hi, ',.3f') + ']');
      });
      var foot = table.append('tfoot');
      foot.append('tr').append('td').attr('colspan', 7).text(
        'Dependent variable: ln(visitors). N = ' + fit.n + ' countries · R² = ' +
        d3.format('.3f')(fit.r2) + ' · adjusted R² = ' + fmtNum(fit.adjR2, '.3f')
      );
      foot.append('tr').append('td').attr('colspan', 7)
        .text('* p < 0.10, ** p < 0.05, *** p < 0.01');

      var parts = [
        'OLS with heteroskedasticity-robust (HC1) standard errors; p-values and intervals use ' +
        'the t distribution with N ' + MINUS + ' k degrees of freedom. The standardized β is ' +
        'the coefficient times sd(x) / sd(ln visitors), in the estimation sample.'
      ];
      if (regs.length > 1) {
        parts.push('The chart shows the variable chosen in the menu holding the other constant: ' +
          'both axes are adjusted for the other variable (residuals from a regression on it, ' +
          'plus the sample mean), so the slope of the line is exactly its coefficient. ' +
          'Labels are World Bank country codes; hover over a dot for details.');
      } else {
        parts.push('Labels are World Bank country codes; hover over a dot for details.');
      }
      parts.push('Distances are great-circle distances between the centroids of each ' +
        'country’s main landmass; France is set at ' + HOME_DISTANCE_KM + ' km.');
      if (opts.covariates && opts.covariates.indicators && opts.covariates.indicators.gdp_pc) {
        parts.push('GDP per capita: ' + opts.covariates.indicators.gdp_pc.name +
          ', World Bank, most recent year available.');
      }
      parts.push('Countries with no visitors are not in the sample' +
        (s.dropped.length ? ', nor are ' + s.dropped.join(', ') + ' (missing data)' : '') + '.');
      parts.push('Re-estimated every time the visitor data updates.');
      note.text(parts.join(' '));
    }
  }

  window.VisitorRegression = {
    render: render,
    /* Exposed for testing. */
    _ols: ols,
    REGRESSORS: REGRESSORS
  };
})();
