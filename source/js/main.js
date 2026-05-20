/**
 * クリニック院情報の埋め込み
 *
 * @param {object} params
 * @param {string} params.parentSelector - 埋め込む親要素のIDセレクタ（必須）
 * @param {'juno' | 'juno-diet' | 'atom'} params.clinicType - クリニックタイプ（必須）
 * @param {Array} [params.areaColors=[]] - カスタムカラー設定（オプション）
 */
export function embedClinicMap({ parentSelector, clinicType, areaColors = [] }) {
  // ──────────────── 引数バリデーション ────────────────
  // バリデーションに失敗した場合は init を no-op で抜けるため、ここでフラグを保持する
  let isValid = true;
  try {
    validateArgument({
      parentSelector,
      clinicType,
      areaColors,
    });
  } catch (e) {
    console.error(e);
    isValid = false;
  }

  /**
   * 性別ラベル定義
   * 
   * @property {string} 1 - 男性専用
   * @property {string} 2 - 女性専用
   */
  const GENDER_LABELS = {
    1: '男性専用',
    2: '女性専用',
  };

  /**
   * カラー設定
   *
   * @property {string} 1 - 北海道・東北のカラーコード文字列
   * @property {string} 2 - 東京のカラーコード文字列
   * @property {string} 3 - 関東のカラーコード文字列
   * @property {string} 4 - 中部のカラーコード文字列
   * @property {string} 5 - 近畿のカラーコード文字列
   * @property {string} 6 - 中国・四国のカラーコード文字列
   * @property {string} 7 - 九州・沖縄のカラーコード文字列
   */
  const defaultAreaColors = {
      1: '#93ace2', // 北海道・東北
      2: '#4bbfb4', // 東京
      3: '#4bbfb4', // 関東
      4: '#a2da62', // 中部
      5: '#e8d54a', // 近畿
      6: '#f27b72', // 中国・四国
      7: '#ed96b1', // 九州・沖縄
  };

  /**
   * 外部から渡されたエリアカラー配列のインデックスを内部用のID(1〜7)に変換する
   *
   * @param {Array} colors - 外部から渡された areaColors
   * @returns {object}
   */
  const formatAreaColors = (colors) => {
    // 未指定 / 空配列なら defaultAreaColors にフォールバック
    if (!Array.isArray(colors) || colors.length === 0) return {};

    // CSSインジェクション対策：HEXカラー形式（#RGB / #RGBA / #RRGGBB / #RRGGBBAA）のみ許可
    const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    const FALLBACK_COLOR = '#ccc';

    const formattedColors = {};
    // areaColors が指定された場合、ID を全て埋める（不正・空・不足は #ccc）
    for (let areaId = 1; areaId <= Object.keys(defaultAreaColors).length; areaId++) {
      const color = colors[areaId - 1];
      formattedColors[areaId] = (color && COLOR_RE.test(color)) ? color : FALLBACK_COLOR;
    }

    return formattedColors;
  };

  const mergedAreaColors = {
    ...defaultAreaColors,
    ...formatAreaColors(areaColors),
  };

  /**
   * 状態管理用のオブジェクト
   *
   * @property {string} mapSvg - 地図用SVGの文字列
   * @property {Array} clinicDetails - 医院詳細情報のJSONデータ
   * @property {boolean} hasTitle - タイトルを埋め込む要素の存在有無のフラグ
   * @property {boolean} hasMap - 地図を埋め込む要素の存在有無のフラグ
   * @property {boolean} hasDetailsAccordion - 詳細アコーディオンを埋め込む要素の存在有無のフラグ
   *
   * NOTE: has* フラグはインスタンス生成時の DOM 状態でスナップショットされる。
   *       init() を非同期実行する間に対象要素が外から差し替えられるケースは想定していない。
   */
  const state = {
    fetchPath: isValid && typeof clinicType === 'string' ? clinicType.replace(/-/g, '/') : '',
    mapSvg: '',
    clinicDetails: [],
    hasTitle: isValid && !!document.querySelector(`${parentSelector} [data-cl-title]`),
    hasMap: isValid && !!document.querySelector(`${parentSelector} [data-cl-map]`),
    hasDetailsAccordion: isValid && !!document.querySelector(
      `${parentSelector} [data-cl-details-accordion]`
    ),
  };

  /**
   * インスタンス引数のバリデーション処理
   * @param {object} params
   * @param {string} params.parentSelector - カレンダーを埋め込む親要素のIDセレクタ
   * @param {string} params.checkBoxAttrName - 日時のチェックボックスのname属性名
   * @param {object} [params.options] - オプション設定
   */
  function validateArgument({ parentSelector, clinicType, areaColors }) {
    // ──────── 親要素セレクタ ────────
    if (!parentSelector) {
      throw new Error('"parentSelector" and "clinicType" is required.');
    }
    // CSS/HTML への文字列補間で利用するため、安全な ID セレクタ形式のみ許可する
    if (!/^#[A-Za-z_][A-Za-z0-9_-]*$/.test(parentSelector.trim())) {
      throw new Error('"parentSelector" must be an ID selector of the form "#alphanumeric-id".');
    }

    // ──────── クリニックタイプ ────────
    if (clinicType !== undefined && typeof clinicType !== 'string') {
      throw new Error('"clinicType" must be a string.');
    }

    // ──────── カラー設定 ────────
    if (areaColors !== undefined && typeof areaColors !== 'object') {
      throw new Error('"areaColors" must be an object.');
    }

    // areaColors に渡されたキーが一致するかのバリデーションは行わない
    // map.js で undefined が返却された場合は、デフォルトカラーが適用される
  }

  /**
   * 引数のfetchのレスポンスの Content-Type が、引数で指定したタイプかを判定
   *
   * @param {Response} response - fetchで取得したレスポンスオブジェクト
   * @param {'json' | 'text' | 'xml' | 'html'} type - 判定するコンテンツタイプ
   * @returns {boolean}
   */
  const isContentType = (response, type) => {
    const contentType = response.headers.get('Content-Type');

    if (!contentType) return false;

    switch (type) {
      case 'json':
        return contentType.includes('application/json');
      case 'text':
        return contentType.includes('text/plain');
      case 'xml':
        return (
          contentType.includes('image/svg+xml') ||
          contentType.includes('application/xml')
        );
      case 'html':
        return contentType.includes('text/html');
      default:
        return false;
    }
  };

  /**
   * state に基づき、タイトルと地図のSVG・アコーディオンをDOMに描画
   *
   * - タイトルを data-cl-title に挿入
   * - 地図SVGは data-cl-map に挿入
   * - 院詳細アコーディオンは data-cl-details-accordion に挿入
   *
   * @returns {void}
   */
  const createContents = () => {
    // タイトル
    if (state.hasTitle) {
      const titleEl = document.querySelector(
        `${parentSelector} [data-cl-title]`
      );

      titleEl.innerHTML = '<div class="cl-title"><div class="cl-title__main">クリニック一覧</div><div class="cl-title__note">ほとんどのクリニックが</div><div class="cl-title__sub">駅から約<span>5</span>分以内</div></div>';
    }

    // 地図SVG
    if (state.hasMap) {
      const mapEl = document.querySelector(`${parentSelector} [data-cl-map]`);

      // TODO: 全国地図SVGはサイズが大きいため、外部ファイル化(source/data/common/map.svg等)してfetchする構成への切り出しを検討
      const mapSvgEl = `
      <?xml version="1.0" encoding="UTF-8"?>
      <svg id="cl-svg-map" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1400 1200">
        <defs>
          <style>
            #cl-svg-map .st1 {
              fill: none;
              stroke: #c6c4c4;
              stroke-linecap: round;
              stroke-linejoin: round;
              stroke-width: 3.16px;
            }
          </style>
        </defs>
        <polyline class="st1" points="38.47 1085.25 108.77 1085.25 142.42 1252.88"/>
        <g id="cl-svg-map-7">
          <rect class="st4" x="21.74" y="1151.3" width="68.71" height="35.53" rx="5.26" ry="5.26"/>
          <rect class="st4" x="197.94" y="995.58" width="65.61" height="122.2" rx="5.26" ry="5.26"/>
          <rect class="st4" x="267.76" y="967" width="58.6" height="87.58" rx="5.26" ry="5.26"/>
          <rect class="st4" x="267.76" y="1058.79" width="58.6" height="59" rx="5.26" ry="5.26"/>
          <rect class="st4" x="165" y="917.27" width="28.73" height="74.11" rx="5.26" ry="5.26"/>
          <path class="st4" d="M135.22,917.27h20.32c2.9,0,5.26,2.36,5.26,5.26v97.3c0,2.9-2.36,5.26-5.26,5.26h-20.32c-2.9,0-5.26-2.36-5.26-5.26v-97.3c0-2.9,2.36-5.26,5.26-5.26Z"/>
          <polygon class="st4" points="197.94 1121.99 197.94 1173.97 242 1173.97 242 1158.12 275.66 1158.12 275.66 1180.59 326.36 1158.12 326.36 1121.99 197.94 1121.99"/>
          <path class="st4" d="M203.2,917.27c-2.89,0-5.26,2.37-5.26,5.26v63.59c0,2.89,2.37,5.26,5.26,5.26h55.09c2.89,0,5.26-2.37,5.26-5.26v-18.06c0-2.89,2.37-5.26,5.26-5.26h52.29c2.89,0,5.26-2.37,5.26-5.26v-35.01c0-2.89-2.37-5.26-5.26-5.26h-117.9Z"/>
        </g>
        <g id="cl-svg-map-6">
          <path class="st6" d="M610.01,1095.34c0,2.89-2.37,5.26-5.26,5.26h-211.93c-2.89,0-5.26-2.37-5.26-5.26v-36.47c0-2.89,2.37-5.26,5.26-5.26h100.71c2.89,0,7.6.36,10.46.79l100.83,15.38c2.86.44,5.2,3.16,5.2,6.05v19.5Z"/>
          <path class="st6" d="M610.01,1061.11c0,2.89-2.34,4.89-5.2,4.45l-98.73-15.35c-2.86-.44-5.2-3.17-5.2-6.07v-23.09c0-2.89,2.37-5.26,5.26-5.26h98.6c2.89,0,5.26,2.37,5.26,5.26v40.06Z"/>
          <path class="st6" d="M471.18,1006.76c-2.89,0-5.26-2.37-5.26-5.26v-22.32c0-2.89-2.37-5.26-5.26-5.26h-67.85c-2.89,0-5.26,2.37-5.26,5.26v64.96c0,2.89,2.37,5.26,5.26,5.26h98.6c2.89,0,5.26-2.37,5.26-5.26v-32.12c0-2.89-2.37-5.26-5.26-5.26h-20.24Z"/>
          <rect class="st6" x="500.88" y="973.92" width="109.12" height="37.82" rx="5.26" ry="5.26"/>
          <path class="st6" d="M350.44,930.12c0,2.89,2.37,5.26,5.26,5.26h48.53c2.89,0,5.26-2.37,5.26-5.26v-117.63c0-2.89-2.06-4.1-4.58-2.68l-49.88,28.02c-2.52,1.42-4.58,4.94-4.58,7.83v84.46Z"/>
          <path class="st6" d="M418.95,807.23h66.53c2.9,0,5.26,2.36,5.26,5.26v51.58c0,2.9-2.36,5.26-5.26,5.26h-66.53c-2.9,0-5.26-2.36-5.26-5.26v-51.58c0-2.9,2.36-5.26,5.26-5.26Z"/>
          <path class="st6" d="M418.95,873.54h66.53c2.9,0,5.26,2.36,5.26,5.26v51.32c0,2.9-2.36,5.26-5.26,5.26h-66.53c-2.9,0-5.26-2.36-5.26-5.26v-51.32c0-2.9,2.36-5.26,5.26-5.26Z"/>
          <rect class="st6" x="494.94" y="873.54" width="75.57" height="61.84" rx="5.26" ry="5.26"/>
          <rect class="st6" x="494.94" y="807.23" width="75.57" height="62.1"/>
        </g>
        <g id="cl-svg-map-5">
          <rect class="st0" x="742.36" y="939.55" width="53.2" height="135" rx="6.99" ry="6.99"/>
          <rect class="st7" x="742.36" y="839.44" width="53.2" height="95.71" rx="6.99" ry="6.99"/>
          <rect class="st7" x="574.72" y="807.23" width="86.18" height="127.48" rx="6.1" ry="6.1"/>
          <rect class="st0" x="704.5" y="939.55" width="33.86" height="95.99" rx="4.78" ry="4.78"/>
          <rect class="st0" x="664.06" y="939.55" width="36.35" height="66.18" rx="5.11" ry="5.11"/>
          <path class="st0" d="M705.8,1039.75c-2.89,0-5.26-2.37-5.26-5.26v-19.3c0-2.89-2.37-5.26-5.26-5.26h-25.97c-2.89,0-5.26,2.37-5.26,5.26v54.1c0,2.89,2.37,5.26,5.26,5.26h63.22c2.89,0,5.26-2.37,5.26-5.26v-24.28c0-2.89-2.37-5.26-5.26-5.26h-26.74Z"/>
          <path class="st7" d="M717.96,837.44c-2.7,0-4.91-2.21-4.91-4.91v-22.38c0-2.7-2.21-4.91-4.91-4.91h-38.11c-2.7,0-4.91,2.21-4.91,4.91v120.1c0,2.7,2.21,4.91,4.91,4.91h62.34c2.7,0,4.91-2.21,4.91-4.91v-87.89c0-2.7-2.21-4.91-4.91-4.91h-14.4Z"/>
        </g>
        <g id="cl-svg-map-4">
          <path class="st2" d="M1018.38,636.76c-2.89,0-7.35,1.1-9.91,2.45l-105.79,55.56c-2.56,1.34-4.66,4.81-4.66,7.7v36.17c0,2.89,2.37,5.26,5.26,5.26h135.65c2.89,0,5.26-2.37,5.26-5.26v-96.62c0-2.89-2.37-5.26-5.26-5.26h-20.55Z"/>
          <rect class="st3" x="964.83" y="879.98" width="63.8" height="55.37" rx="5.26" ry="5.26"/>
          <path class="st2" d="M903.28,748.1c-2.89,0-5.26,2.37-5.26,5.26v176.72c0,2.89,2.37,5.26,5.26,5.26h52.08c2.89,0,5.26-2.37,5.26-5.26v-49.06c0-2.89,2.37-5.26,5.26-5.26h13.49c2.89,0,5.26-2.37,5.26-5.26v-117.15c0-2.89-2.37-5.26-5.26-5.26h-76.09Z"/>
          <path class="st3" d="M903.28,939.55c-2.89,0-5.26,2.37-5.26,5.26v51.46c0,2.89,2.37,5.26,5.26,5.26h49.32c2.89,0,7.05-1.55,9.23-3.45l19.82-17.2c2.18-1.9,6.34-3.45,9.23-3.45h7.58c2.89,0,5.26,2.37,5.26,5.26v13.57c0,2.89,2.37,5.26,5.26,5.26h14.38c2.89,0,5.26-2.37,5.26-5.26v-51.46c0-2.89-2.37-5.26-5.26-5.26h-120.09Z"/>
          <rect class="st2" x="830.29" y="697.21" width="63.53" height="46.68" rx="5.26" ry="5.26"/>
          <path class="st2" d="M791.59,648.42c-2.89,0-5.26,2.37-5.26,5.26v38.27c0,2.89-1.43,7.14-3.18,9.45l-29.03,38.3c-1.75,2.31-.81,4.19,2.08,4.19h64.61c2.89,0,5.26-2.37,5.26-5.26v-84.95c0-2.89-2.37-5.26-5.26-5.26h-29.23Z"/>
          <path class="st2" d="M835.54,748.1c-2.89,0-5.26,2.37-5.26,5.26v80.82c0,2.89-2.37,5.26-5.26,5.26h-20c-2.89,0-5.26,2.37-5.26,5.26v85.39c0,2.89,2.37,5.26,5.26,5.26h83.53c2.89,0,5.26-2.37,5.26-5.26v-176.72c0-2.89-2.37-5.26-5.26-5.26h-53.01Z"/>
          <path class="st2" d="M756.21,748.1c-2.89,0-5.26,2.37-5.26,5.26v48.61c0,2.89-2.37,5.26-5.26,5.26h-23.39c-2.89,0-5.26,2.37-5.26,5.26v17.48c0,2.89,2.37,5.26,5.26,5.26h98.52c2.89,0,5.26-2.37,5.26-5.26v-76.61c0-2.89-2.37-5.26-5.26-5.26h-64.61Z"/>
          <path class="st3" d="M805.03,939.55c-2.89,0-5.26,2.37-5.26,5.26v33.68c0,2.89,2.37,5.26,5.26,5.26h9.64c2.89,0,5.26,2.37,5.26,5.26v7.27c0,2.89,2.37,5.26,5.26,5.26h63.37c2.89,0,5.26-2.37,5.26-5.26v-51.46c0-2.89-2.37-5.26-5.26-5.26h-83.53Z"/>
        </g>
        <g id="cl-svg-map-2">
          <rect class="st5" x="1048.4" y="748.1" width="54" height="79.09" rx="5.26" ry="5.26"/>
          <rect class="st5" x="1032.83" y="920.69" width="69.57" height="38.04" rx="5.26" ry="5.26"/>
          <rect class="st5" x="988.83" y="748.1" width="55.35" height="79.09" rx="5.26" ry="5.26"/>
          <rect class="st5" x="1032.83" y="879.98" width="69.57" height="36.51" rx="5.26" ry="5.26"/>
          <path class="st5" d="M1111.86,848.47c-2.89,0-5.26,2.37-5.26,5.26v60.5c0,2.89,2.37,5.26,5.26,5.26h9.8c2.89,0,5.26,2.37,5.26,5.26v19.88c0,2.89,2.37,5.26,5.26,5.26h41.93c2.89,0,5.26-2.37,5.26-5.26v-90.89c0-2.89-2.37-5.26-5.26-5.26h-62.25Z"/>
          <rect class="st5" x="988.83" y="831.4" width="113.57" height="44.37" rx="5.26" ry="5.26"/>
          <path class="st5" d="M1172.95,827.27c-1.02-2.71-1.86-7.28-1.86-10.18v-63.74c0-2.89-2.37-5.26-5.26-5.26h-53.97c-2.89,0-5.26,2.37-5.26,5.26v85.64c0,2.89,2.37,5.26,5.26,5.26h62.25c2.89,0,4.42-2.21,3.4-4.92l-4.57-12.07Z"/>
        </g>
        <g id="cl-svg-map-1">
          <path class="st8" d="M1163.85,401.37c-1.51-2.47-2.74-6.85-2.74-9.74v-36.43c0-2.89-2.37-5.26-5.26-5.26h-29.78c-2.89,0-5.26,2.37-5.26,5.26v36.43c0,2.89-2.37,5.26-5.26,5.26h-20.41c-2.89,0-5.26-2.37-5.26-5.26v-13.65c0-2.89-2.37-5.26-5.26-5.26h-66.22c-2.89,0-5.26,2.37-5.26,5.26v66.51c0,2.89,2.37,5.26,5.26,5.26h169.78c2.89,0,4.02-2.02,2.51-4.49l-26.85-43.89Z"/>
          <path class="st8" d="M1099.73,453.95c-2.89,0-5.26,2.37-5.26,5.26v85.11c0,2.89,2.37,5.26,5.26,5.26h66.1c2.89,0,7.13-1.44,9.43-3.21l14.01-10.79c2.29-1.76,4.17-5.57,4.17-8.47v-67.91c0-2.89-2.37-5.26-5.26-5.26h-88.44Z"/>
          <rect class="st8" x="1013.12" y="453.95" width="77.15" height="95.63" rx="5.26" ry="5.26"/>
          <path class="st8" d="M1099.73,553.78h66.1c2.9,0,5.26,2.36,5.26,5.26v92.61c0,2.9-2.36,5.26-5.26,5.26h-66.1c-2.9,0-5.26-2.36-5.26-5.26v-92.61c0-2.9,2.36-5.26,5.26-5.26Z"/>
          <rect class="st8" x="1048.4" y="661.12" width="122.69" height="82.78" rx="5.26" ry="5.26"/>
          <path class="st8" d="M1018.38,553.78c-2.89,0-5.26,2.37-5.26,5.26v68.25c0,2.89,2.37,5.26,5.26,5.26h24.76c2.89,0,5.26,2.37,5.26,5.26v13.84c0,2.89,2.37,5.26,5.26,5.26h31.35c2.89,0,5.26-2.37,5.26-5.26v-92.61c0-2.89-2.37-5.26-5.26-5.26h-66.63Z"/>
          <path class="st8" d="M1375.01,140.43c0-2.89-2.37-5.26-5.26-5.26h-55.23c-2.89,0-7.27-1.25-9.73-2.77l-174.04-107.74c-2.46-1.52-6.84-2.75-9.73-2.73l-48.35.38c-2.89.02-5.26,2.41-5.26,5.3l-.15,153.75c0,2.89-1.52,7.08-3.37,9.3l-47.29,56.76c-1.85,2.22-3.39,4.04-3.42,4.04s-.05,2.37-.05,5.26v56.73c0,2.89,2.37,5.26,5.26,5.26h68.46c2.89,0,5.26-2.37,5.26-5.26v-29.43c0-2.89,2.37-5.26,5.26-5.27l42-.06c2.89,0,7.52.7,10.27,1.58l92.75,29.28c2.76.87,6.53-.24,8.37-2.46l55.51-66.89c1.85-2.23,5.72-4.05,8.62-4.05h54.86c2.89,0,5.26-2.37,5.26-5.26v-90.45Z"/>
        </g>
      </svg>`;

      mapEl.innerHTML = `
        <div class="cl-map">
          ${createAreaListDom()}
          ${mapSvgEl}
        </div>
      `;
    }

    // 院詳細アコーディオン
    if (state.hasDetailsAccordion && state.clinicDetails.length > 0) {
      const detailsAccordionElement = document.querySelector(
        `${parentSelector} [data-cl-details-accordion]`
      );

      const detailsAccordionDom = createClinicDetailsAccordion();

      detailsAccordionElement.innerHTML = '';
      detailsAccordionElement.appendChild(detailsAccordionDom);
    }
  };

  /**
   * HTML特殊文字をエスケープする
   * @param {string} str
   * @returns {string}
   */
  const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /**
   * エリア一覧のDOM(HTML文字列)を生成する
   *
   * @returns {string}
   */
  const createAreaListDom = () => {
    let html = '';

    if (Array.isArray(state.clinicDetails)) {
      state.clinicDetails.forEach((areaData) => {
        html += `
        <a href="${parentSelector}-area-${escapeHtml(areaData.id)}" class="cl-map__nav-item cl-map__nav-item-${escapeHtml(areaData.id)}">
          <div class="cl-map__nav-item-pin">
            <svg id="cl-svg-pin" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 330.48 466.24">
              <!-- Generator: Adobe Illustrator 30.4.0, SVG Export Plug-In . SVG Version: 2.1.4 Build 226)  -->
              <path d="M304.61,76.71C179.59-103.11-84,65.07,26.41,254.23l133.24,208.8c2.73,4.28,8.99,4.28,11.73,0l133.24-208.8c33.33-52.43,35.63-121.69,0-177.52ZM165.24,233.15c-41.75,0-75.6-33.85-75.6-75.6s33.85-75.6,75.6-75.6,75.6,33.85,75.6,75.6-33.85,75.6-75.6,75.6Z"/>
            </svg>
          </div>
          <div class="cl-map__nav-item-label">${escapeHtml(areaData.area)}</div>
        </a>
      `;
      });
    }

    return html;
  };

  /**
   * クリニック詳細のアコーディオンDOMを生成する
   *
   * state.clinicDetails に格納されたデータをもとに生成する
   *
   * @returns {HTMLElement}
   */
  const createClinicDetailsAccordion = () => {
    const container = document.createElement('div');
    container.innerHTML = `<div class="cl-details-acd__list"></div>`;
    const listEl = container.firstElementChild;

    // fetch したJSONデータを元にDOMを作成
    state.clinicDetails.forEach((areaData) => {
      const areaWrapper = document.createElement('div');
      areaWrapper.innerHTML = `
        <div class="cl-details-acd__list-item" id="${parentSelector.replace('#', '')}-area-${escapeHtml(areaData.id)}">
          <label class="cl-details-acd__list-item-header">
            <input type="checkbox">
            ${escapeHtml(areaData.area)}エリア<span class="cl-details-acd__list-item-icon"></span>
          </label>
          <div class="cl-details-acd__list-item-body"></div>
        </div>
      `;
      const bodyEl = areaWrapper.querySelector(
        '.cl-details-acd__list-item-body'
      );

      // エリア毎の院情報一覧のDOMを作成
      areaData?.clinics?.forEach((clinic) => {
        const businessStart = escapeHtml(clinic.hours?.business_start);
        const businessEnd = escapeHtml(clinic.hours?.business_end);

        const shopHtml = `
        <div class="cl-details-acd__list-sub-item">
          <div class="cl-details-acd__list-sub-item-header">
            ${escapeHtml(clinic.clinic_name)}
            ${clinic.is_partner ? "（提携院）" : ""}
            ${GENDER_LABELS[clinic.gender_id] ? `<span class='cl-details-acd__list-sub-item-header-label'>${GENDER_LABELS[clinic.gender_id]}</span>` : ''}
          </div>
          <table class="cl-details-acd__list-sub-item-table">
            <tr>
              <th>診療時間</th>
              <td>${businessStart}-${businessEnd}</td>
            </tr>
            <tr>
              <th>休診日</th>
              <td>不定休・年末年始</td>
            </tr>
            <tr>
              <th>最寄駅</th>
              <td>${escapeHtml(clinic.full)}</td>
            </tr>
          </table>
        </div>
      `;

        bodyEl.insertAdjacentHTML('beforeend', shopHtml);
      });

      listEl.appendChild(areaWrapper.firstElementChild);
    });

    return listEl;
  };

  /**
   * スタイルタグの埋め込み
   *
   * - 医院詳細のレイアウト、アコーディオン用CSS
   * - カラー設定（mainColor、subColor）をもとに、SVGや要素の色付け
   *
   * @returns {void}
   */
  const embedStyleTag = () => {
    const styles = `
      ${parentSelector} {
        --base-width: 375;
        --max-width: 640;
        --base-font-size: 10;

        font-size: min(
          calc((var(--base-font-size) / var(--base-width)) * 100vw),
          calc((var(--base-font-size) / var(--base-width)) * var(--max-width) * 1px)
        );
      }
      /* タイトル */
      ${parentSelector} .cl-title {
        margin: 0;
        padding-top: 1.5em;
        color: #232323;
        text-align: center;
      }
      ${parentSelector} .cl-title__main {
        font-size: 3em;
        font-weight: bold;
        margin-bottom: .4em;
      }
      ${parentSelector} .cl-title__note {
        background-color: #f4f4f4;
        padding: .2em .8em;
        display: inline-block;
        border-radius: .5em;
        font-size: 1.5em;
        font-weight: 600;
        letter-spacing: 0;
      }
      ${parentSelector} .cl-title__sub {
        font-size: 2em;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: 2px;
      }
      ${parentSelector} .cl-title__sub span {
        font-size: 2.3em;
        margin: 0 .05em;
        display: inline-block;
        transform: translateY(.05em);
      }
      /* 地図 */
      ${parentSelector} .cl-map {
        position:relative;
        padding-bottom: 8em;
      }
      ${parentSelector} .cl-map__nav-item {
        width: fit-content;
        padding: .9em 1.5em .9em 1em;
        line-height: 1.2;
        letter-spacing: 3px;
        display: flex;
        align-items: center;
        gap: 1em;
        background-color: #fff;
        box-shadow: .1em .1em .6em rgba(0, 0, 0, 0.15);
        border-radius: .5em;
        position:absolute;
        z-index: 10;
        color: #232323;
        transition: all 0.2s;
        text-decoration: none;
        ${state.hasDetailsAccordion ? 'cursor:pointer;' : 'pointer-events:none; cursor:default;'}
      }
      ${state.hasDetailsAccordion ? `
      @media (hover: hover) {
        ${parentSelector} .cl-map__nav-item:hover {
          transform: scale(.95);
          transition: all 0.2s;
        }
      }` : ``}
      ${parentSelector} .cl-map__nav-item-1 {
        top: 14.5%;
        left: 37.5%;
      }
      ${parentSelector} .cl-map__nav-item-1 svg {
        fill: ${mergedAreaColors[1]};
      }
      ${parentSelector} .cl-map__nav-item-2 {
        top: 61%;
        left: 75.5%;
      }
      ${parentSelector} .cl-map__nav-item-2 svg {
        fill: ${mergedAreaColors[2]};
      }
      ${parentSelector} .cl-map__nav-item-3 {
        top: 73.5%;
        left: 68.5%;
      }
      ${parentSelector} .cl-map__nav-item-3 svg {
        fill: ${mergedAreaColors[3]};
      }
      ${parentSelector} .cl-map__nav-item-4 {
        top: 26.5%;
        left: 37.5%;
      }
      ${parentSelector} .cl-map__nav-item-4 svg {
        fill: ${mergedAreaColors[4]};
      }
      ${parentSelector} .cl-map__nav-item-5 {
        top: 73.5%;
        left: 43.5%;
      }
      ${parentSelector} .cl-map__nav-item-5 svg {
        fill: ${mergedAreaColors[5]};
      }
      ${parentSelector} .cl-map__nav-item-6 {
        top: 42.5%;
        left: 15.5%;
      }
      ${parentSelector} .cl-map__nav-item-6 svg {
        fill: ${mergedAreaColors[6]};
      }
      ${parentSelector} .cl-map__nav-item-7 {
        top: 80%;
        left: 1%;
      }
      ${parentSelector} .cl-map__nav-item-7 svg {
        fill: ${mergedAreaColors[7]};
      }
      ${parentSelector} .cl-map__nav-item-pin {
        width: 1.2em;
        height: 1.5em;
      }
      ${parentSelector} .cl-map__nav-item-label {
        font-size: 1.4em;
        font-weight: bold;
        line-height: 1.2;
        letter-spacing: 0;
      }
      /* 地図SVG */
      ${parentSelector} #cl-svg-map-1 {
        fill: ${mergedAreaColors[1]};
      }
      ${parentSelector} #cl-svg-map-2 {
        fill: ${mergedAreaColors[2]};
      }
      ${parentSelector} #cl-svg-map-3 {
        fill: ${mergedAreaColors[3]};
      }
      ${parentSelector} #cl-svg-map-4 {
        fill: ${mergedAreaColors[4]};
      }
      ${parentSelector} #cl-svg-map-5 {
        fill: ${mergedAreaColors[5]};
      }
      ${parentSelector} #cl-svg-map-6 {
        fill: ${mergedAreaColors[6]};
      }
      ${parentSelector} #cl-svg-map-7 {
        fill: ${mergedAreaColors[7]};
      }
      /* 詳細アコーディオン */
      ${parentSelector} .cl-details-acd__list-item-header {
        display: block;
        padding: 1.5em .5em;
        border-radius: .5em;
        position: relative;
        color: #232323;
        text-align: left;
        font-size: 1.4em;
        font-weight: bold;
      }

      @media (hover: hover) {
        ${parentSelector} .cl-details-acd__list-item-header:hover {
          opacity: 0.8;
          transition: opacity 0.2s;
        }
      }
      ${parentSelector} .cl-details-acd__list-item-icon {
        width: 1.2em;
        height: 1.2em;
        padding: .25em;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        right: 3%;
        transform: translateY(-50%);
        display: block;
        background-color: #4e4e4e;
      }
      ${parentSelector} .cl-details-acd__list-item-icon::after {
        width: .7em;
        height: .7em;
        display: block;
        content: '';
        mask: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyBpZD0ibWRpLXBsdXMtbWludXMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDUwIDUwIj4gICA8cGF0aCBkPSJNMjEuNDQsMy42M3YxNy44MUgzLjYzdjcuMTJoMTcuODF2MTcuODFoNy4xMnYtMTcuODFoMTcuODF2LTcuMTJoLTE3LjgxVjMuNjNoLTcuMTIiLz4gPC9zdmc+) center / 100% auto no-repeat;
        background-color: #fff;
      }
      ${parentSelector} .cl-details-acd__list-item-header input[type='checkbox'] {
        display: none;
      }
      ${parentSelector} .cl-details-acd__list-item-body {
        height: 0;
        padding: 0;
        overflow: hidden;
        transition: padding 0.3s;
        border-bottom: 2px solid #cacaca;
      }
      /* for when opened */
      ${parentSelector} .cl-details-acd__list-item-header:has(input[type='checkbox']:checked) + .cl-details-acd__list-item-body {
        height: auto;
        padding: 1em 0 0.5em 0;
        transition: padding 0.3s;
      }
      ${parentSelector} .cl-details-acd__list-item-header:has(input[type='checkbox']:checked) .cl-details-acd__list-item-icon::after {
        mask: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyBpZD0ibWRpLXBsdXMtbWludXMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDUwIDUwIj4gICA8cmVjdCB4PSIzLjYzIiB5PSIyMS40NCIgd2lkdGg9IjQyLjc1IiBoZWlnaHQ9IjcuMTIiLz4gPC9zdmc+) center / 100% auto no-repeat;
      }
      /* / for when opened */
      ${parentSelector} .cl-details-acd__list-sub-item {
        margin-bottom: 1.5em;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-header {
        display: flex;
        justify-content: center;
        gap: .7em;
        align-items: center;
        padding: .6em 0;
        margin-bottom: 1em;
        background-color: #efefef;
        border-radius: .6em;
        text-align: center;
        font-size: 1.4em;
        font-weight: bold;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-header-label {
        padding: .1em .5em;
        background-color: #fff;
        font-size: 1em;
        border-radius: .2em;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-table {
        width: 100%;
        margin-bottom: 1em;
        font-size: 1.3em;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-table th,
      ${parentSelector} .cl-details-acd__list-sub-item-table td {
        padding: 0.3em 0;
        text-align: left;
        font-weight: normal;
        vertical-align: top;
        white-space: pre-line;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-table th {
        width: 20%;
        font-weight: bold;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-iframe {
        width: 100%;
        border: none;
      }
    `;

    // styleタグ埋め込み
    const styleEle = document.createElement('style');
    styleEle.textContent = styles;

    document.head.appendChild(styleEle);
  };

  /**
   * 引数のURLからをfetchする非同期関数
   *
   * @param {string} url - データを取得するURL
   * @returns {Promise<Response | undefined>}
   */
  const fetchData = async (url) => {
    try {
      const res = await fetch(url);

      // スタータスコード200以外でエラー
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);

      return res;
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * タイトルと地図SVG、医院詳細JSONを並列でfetchして、state に格納する非同期処理
   *
   * - 各データは表示するかのフラグ（hasTitle / hasMap / hasDetailsAccordion）にもとづき処理する
   * - fetchに失敗しても他のfetch処理は継続する
   * - Content-Typeをチェックし、正しい形式のレスポンスのみstateに保存
   *
   * @returns {Promise<void>}
   */

  const fetchAllWithSetData = async () => {

    // 院情報詳細JSONのfetch先URL
    if (state.hasMap ||state.hasDetailsAccordion) {
      const url = new URL(
        `../data/${state.fetchPath}/clinic-data.json`,
        import.meta.url
      );
      const resDetails = await fetchData(url);

      if (!resDetails) {
        throw new Error('Failed to fetch clinic data.');
      }
      if (resDetails.ok && isContentType(resDetails, 'json')) {
        state.clinicDetails = await resDetails.json();
      } else {
        throw new Error(`HTTP error status: ${resDetails.status}`);
      }
    }
  };

  /**
   * エリア毎のクリニック一覧を sort_num の昇順でソートする
   *
   * @returns {void}
   */
  const sortClinicsBySortNum = () => {
    if (Array.isArray(state.clinicDetails)) {
      state.clinicDetails.forEach((areaData) => {
        if (Array.isArray(areaData.clinics)) {
          areaData.clinics.sort((a, b) => a.sort_num - b.sort_num);
        }
      });
    }
  };

  /**
   * 地図ナビゲーションピンのクリックイベントを登録する
   * クリックされたピンの対応するアコーディオンを開く
   *
   * NOTE: createContents() が `innerHTML = ''` + appendChild で DOM を作り直すため、
   *       通常フローでは前回登録のリスナーは要素ごと破棄され、リーク・多重発火は起きない。
   *       ただし同一 parentSelector で init() を複数回呼ぶ運用は想定外。
   *       2 回目以降は同じ DOM ノードに対するハンドラ累積になる可能性があるため避けること。
   *
   * @returns {void}
   */
  const addEvents = () => {
    const navItems = document.querySelectorAll(`${parentSelector} .cl-map__nav-item`);
    
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        // CSSでのスムーズスクロールを活かすため e.preventDefault() は呼ばない
        const targetSelector = item.getAttribute('href');
        
        if (targetSelector && targetSelector.startsWith('#')) {
          const targetEl = document.querySelector(targetSelector);
          if (targetEl) {
            const checkbox = targetEl.querySelector('input[type="checkbox"]');
            if (checkbox) {
              checkbox.checked = true;
            }
          }
        }
      });
    });
  };

  /**
   * クリニック院情報の埋め込みの初期化処理
   *
   * - 必要なSVGやJSONリソースを全て取得し、stateに格納
   * - DOM要素とスタイルを埋め込む
   *
   * @returns {void}
   */
  const init = async () => {
    // バリデーション失敗時は何もしない（不正な parentSelector による querySelector の SyntaxError を防ぐ）
    if (!isValid) return;
    try {
      // 全てのリソース（SVG、JSONデータ）を fetch して state に保存
      await fetchAllWithSetData();
      // エリア毎のクリニックをソート
      sortClinicsBySortNum();
      // state からDOM生成
      createContents();
      embedStyleTag();
      // イベントリスナーの登録
      addEvents();
    } catch (e) {
      console.error(e);
    }
  };

  return {
    init,
  };
}
