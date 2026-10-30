/* =====================================================
   进制转换工具 - 全站共用逻辑（原生 JS，无任何依赖）
   提供：
   1) initSyncConverter  首页「四进制同步输入」转换器
   2) initConvertTool    内页「指定进制互转」转换器
   ===================================================== */
(function () {
  "use strict";

  var DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

  /* 校验某字符串是否为合法的 base 进制数（忽略前缀 0x / 0b / 0o，忽略空格与下划线） */
  function isValidInBase(raw, base) {
    var s = normalize(raw);
    if (!s) return false;
    var range = DIGITS.slice(0, base);
    for (var i = 0; i < s.length; i++) {
      if (range.indexOf(s[i]) === -1) return false;
    }
    return true;
  }

  /* 去掉常见前缀、空格与下划线，并转小写 */
  function normalize(raw) {
    var s = String(raw || "").trim().toLowerCase().replace(/[\s_]/g, "");
    s = s.replace(/^0x/, "").replace(/^0b/, "").replace(/^0o/, "");
    return s;
  }

  /* 大数安全转换：借助字符串逐位运算，避免超出 Number 精度
     返回十进制大数字符串 */
  function toDecimalString(raw, base) {
    var s = normalize(raw);
    var dec = "0";
    var bigBase = String(base);
    for (var i = 0; i < s.length; i++) {
      var digitVal = String(DIGITS.indexOf(s[i]));
      dec = bigMulAdd(dec, bigBase, digitVal);
    }
    return dec;
  }

  /* 大数乘加：dec = dec * base + add（均为十进制数字字符串） */
  function bigMulAdd(dec, base, add) {
    var carry = 0;
    var addNum = parseInt(add, 10);
    var result = "";
    for (var i = dec.length - 1; i >= 0; i--) {
      var t = parseInt(dec[i], 10) * parseInt(base, 10) + carry;
      carry = Math.floor(t / 10);
      result = (t % 10) + result;
    }
    /* 处理剩余进位 */
    while (carry > 0) {
      result = (carry % 10) + result;
      carry = Math.floor(carry / 10);
    }
    /* 加 add */
    var i2 = result.length - 1;
    var carry2 = addNum;
    var out = "";
    while (i2 >= 0 || carry2 > 0) {
      var d = i2 >= 0 ? parseInt(result[i2], 10) : 0;
      var sum = d + (carry2 % 10);
      /* 简化：add 通常只有一位，直接按位加 */
      out = (sum % 10) + out;
      carry2 = Math.floor(carry2 / 10) + Math.floor(sum / 10);
      i2--;
    }
    out = out.replace(/^0+(?=\d)/, "");
    return out || "0";
  }

  /* 大数十进制字符串转任意进制字符串 */
  function fromDecimalString(dec, base) {
    if (dec === "0") return "0";
    var digits = [];
    var n = dec;
    var b = parseInt(base, 10);
    while (n !== "0" && n !== "") {
      var q = "", r = 0;
      for (var i = 0; i < n.length; i++) {
        var cur = r * 10 + parseInt(n[i], 10);
        q += Math.floor(cur / b);
        r = cur % b;
      }
      q = q.replace(/^0+(?=\d)/, "");
      digits.unshift(DIGITS[r]);
      n = q || "0";
      if (q === "") break;
    }
    return digits.join("");
  }

  /* 任意进制字符串 → 任意进制字符串（大于 10 的进制结果统一大写展示） */
  function convert(raw, fromBase, toBase) {
    var dec = toDecimalString(raw, fromBase);
    if (toBase === 10) return dec;
    var result = fromDecimalString(dec, toBase);
    return toBase > 10 ? result.toUpperCase() : result;
  }

  /* 千分位分隔（仅展示十进制结果时使用） */
  function groupThousands(decStr) {
    return decStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /* ---------------- 首页：四进制同步输入 ---------------- */
  function initSyncConverter(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return;
    var inputs = root.querySelectorAll("input[data-base]");
    var msg = root.querySelector(".tool-msg");

    inputs.forEach(function (input) {
      input.addEventListener("input", function () {
        var fromBase = parseInt(input.getAttribute("data-base"), 10);
        var raw = input.value;

        inputs.forEach(function (el) { el.classList.remove("invalid"); });

        if (raw.trim() === "") {
          inputs.forEach(function (el) { el.value = ""; });
          if (msg) { msg.textContent = ""; msg.className = "tool-msg"; }
          return;
        }

        if (!isValidInBase(raw, fromBase)) {
          input.classList.add("invalid");
          if (msg) {
            msg.textContent = "输入的字符不符合 " + fromBase + " 进制规则，请检查后重新输入。";
            msg.className = "tool-msg error";
          }
          return;
        }

        inputs.forEach(function (el) {
          var toBase = parseInt(el.getAttribute("data-base"), 10);
          if (el === input) return;
          var result = convert(raw, fromBase, toBase);
          el.value = toBase === 10 ? groupThousands(result) : result;
        });

        if (msg) {
          msg.textContent = "已同步换算完成，复制任意一栏即可使用。";
          msg.className = "tool-msg ok";
        }
      });
    });

    /* 快捷示例按钮 */
    root.querySelectorAll("[data-example]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-value");
        var base = btn.getAttribute("data-example");
        var target = root.querySelector('input[data-base="' + base + '"]');
        if (!target) return;
        target.value = value;
        target.dispatchEvent(new Event("input"));
      });
    });
  }

  /* ---------------- 内页：指定进制互转（下拉框版 / 首页 tab 版通用） ---------------- */
  function initConvertTool(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return;
    var fromSel = root.querySelector('select[name="from-base"]');
    var toSel = root.querySelector('select[name="to-base"]');
    var input = root.querySelector('input[name="source"]');
    var output = root.querySelector("output");
    var msg = root.querySelector(".tool-msg");
    var swapBtn = root.querySelector(".swap-btn");
    var copyBtn = root.querySelector(".copy-btn");

    /* 把 select 的当前值同步到 tab 按钮的选中态（首页 tab 版使用） */
    function syncTabs() {
      root.querySelectorAll(".base-tabs").forEach(function (group) {
        var target = group.getAttribute("data-for");
        var current = target === "from" ? fromSel.value : toSel.value;
        group.querySelectorAll("button").forEach(function (btn) {
          var isActive = btn.getAttribute("data-base") === String(current);
          btn.classList.toggle("active", isActive);
          if (isActive) btn.setAttribute("aria-selected", "true");
          else btn.removeAttribute("aria-selected");
        });
      });
    }

    /* tab 点击：写入对应 select，刷新选中态并立即换算 */
    root.querySelectorAll(".base-tabs").forEach(function (group) {
      var target = group.getAttribute("data-for");
      group.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var base = btn.getAttribute("data-base");
          if (target === "from") fromSel.value = base;
          else toSel.value = base;
          syncTabs();
          run();
        });
      });
    });

    function run() {
      var fromBase = parseInt(fromSel.value, 10);
      var toBase = parseInt(toSel.value, 10);
      var raw = input.value;
      output.textContent = "";
      if (msg) { msg.textContent = ""; msg.className = "tool-msg"; }
      input.classList.remove("invalid");

      if (raw.trim() === "") return;

      if (!isValidInBase(raw, fromBase)) {
        input.classList.add("invalid");
        if (msg) {
          msg.textContent = "输入值不是合法的 " + fromBase + " 进制数，请检查字符范围。";
          msg.className = "tool-msg error";
        }
        return;
      }

      var result = convert(raw, fromBase, toBase);
      output.textContent = toBase === 10 ? groupThousands(result) : result;
      if (msg) {
        msg.textContent = "换算完成：已在右侧 / 下方给出 " + toBase + " 进制结果。";
        msg.className = "tool-msg ok";
      }
    }

    if (input) input.addEventListener("input", run);
    if (fromSel) fromSel.addEventListener("change", run);
    if (toSel) toSel.addEventListener("change", run);

    if (swapBtn) {
      swapBtn.addEventListener("click", function () {
        var t = fromSel.value;
        fromSel.value = toSel.value;
        toSel.value = t;
        syncTabs();
        run();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = output.textContent;
        if (!text) return;
        var done = function () {
          var old = copyBtn.textContent;
          copyBtn.textContent = "已复制 ✓";
          setTimeout(function () { copyBtn.textContent = old; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done);
        } else {
          var ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          done();
        }
      });
    }

    /* 初始化时按 select 默认值点亮 tab */
    syncTabs();
  }

  /* 页面加载后自动初始化所有标记了 data-convert 属性的工具区 */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-sync-converter]").forEach(function (el) {
      initSyncConverter(el.id);
    });
    document.querySelectorAll("[data-convert-tool]").forEach(function (el) {
      initConvertTool(el.id);
    });
  });

  /* 暴露到全局，便于调试 */
  window.BaseConverter = {
    convert: convert,
    isValidInBase: isValidInBase
  };
})();
