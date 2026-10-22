/**
 * Opt-in New visuals beta derivatives for the audited visual-review roster.
 *
 * Every value is a freshly uploaded /manus-storage derivative of an immutable
 * archived original. The derivative process only contain-resizes embedded
 * textures to 512px maximum; the external audit records exact geometry,
 * accessors, mesh, node, material, and non-texture-bufferView checks.
 * This map makes no asset a gameplay default: callers must retain their
 * existing beta gate and procedural fallback on a missing/failed load.
 */

export type ManagedStorageGlbUrl = `/manus-storage/${string}.glb`;

export interface BetaVisualModelDerivative {
  readonly modelUrl: ManagedStorageGlbUrl;
  /** Actual uploaded derivative GLB bytes; safe to project into runtime candidate.sourceBytes. */
  readonly sourceBytes: number;
  /** Archived immutable original GLB bytes recorded for provenance only. */
  readonly originalSourceBytes: number;
  /** Independently recorded audited derivative size; must equal sourceBytes. */
  readonly derivativeBytes: number;
  readonly sha256: string;
  readonly originalSha256: string;
  readonly textureResolution: number;
  /** Decoded RGBA bytes, including a 4/3 full-mipmap-chain multiplier. */
  readonly textureBytesEstimated: number;
}

/** Immutable-source provenance; detailed per-file hashes live outside the repo. */
export const BETA_VISUAL_MODEL_PROVENANCE = {
  originals: "unchanged",
  derivative: "embedded-textures-contain-resized-to-512px",
  auditRecord:
    "/home/ubuntu/sunder-art-pipeline/beta-visuals/ledger/derivative-audit.json",
} as const;

/** Maps each original roster URL to its audited beta-only runtime derivative. */
export const BETA_VISUAL_MODELS = {
  "/manus-storage/auren-arcanist-tripo-p2-v1_bccc218f.glb": {
    modelUrl: "/manus-storage/auren-arcanist-tripo-p2-v1-beta-512_0fbf93ce.glb",
    sourceBytes: 751_824,
    originalSourceBytes: 3_328_668,
    derivativeBytes: 751_824,
    sha256: "730fc80030ee8d1d1e2a9a2341a94332dabca85a6afee0800e2d8fa4d11ae670",
    originalSha256:
      "7311038e50e37e4ebb276adb769ea54d55eea717e2facb28aa22b25504677240",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/auren-archer-tripo-p2-v1_d0a2631a.glb": {
    modelUrl: "/manus-storage/auren-archer-tripo-p2-v1-beta-512_afc6e3f2.glb",
    sourceBytes: 757_336,
    originalSourceBytes: 3_191_580,
    derivativeBytes: 757_336,
    sha256: "4bddcf1f539372ec4c0354e46cffc9e786521617efd29da8e4dddec743422e1d",
    originalSha256:
      "62c8d3f9c9436646c788f06127d0f79ffe3f0234c3be24dcd8e3547a668eebcf",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/auren-defender-tripo-p2-v1_7a2eaa5e.glb": {
    modelUrl: "/manus-storage/auren-defender-tripo-p2-v1-beta-512_1e0d68c2.glb",
    sourceBytes: 735_764,
    originalSourceBytes: 3_463_632,
    derivativeBytes: 735_764,
    sha256: "7d4d721c9b9755c505dcb090e38a780d60fadc17c3115096d6f2767f15eaa2bf",
    originalSha256:
      "0b7b00548010a49c14f5965a8da8dcb64c59b613f4813c94103aacb0267e27ef",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/auren-maelis-tripo-p2-v1_443cbc66.glb": {
    modelUrl: "/manus-storage/auren-maelis-tripo-p2-v1-beta-512_354a21fb.glb",
    sourceBytes: 801_704,
    originalSourceBytes: 3_476_540,
    derivativeBytes: 801_704,
    sha256: "42a937dcfaa4b875c8f1e5c09b530971f5627732683a4dd8ee0f3f5ea15e9722",
    originalSha256:
      "665c3207a15a0f45f5b656a90f13b895e1a1d77d8adb4a4ee29cfdc8ecdab752",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/auren-rider-tripo-p2-v1_127d9a50.glb": {
    modelUrl: "/manus-storage/auren-rider-tripo-p2-v1-beta-512_b470d560.glb",
    sourceBytes: 795_340,
    originalSourceBytes: 3_543_656,
    derivativeBytes: 795_340,
    sha256: "d41c28f378aba3b61a0877f1640c8e438e50b024b271440f8a85252b6e5f2d5e",
    originalSha256:
      "dd5e4c778da10a0d82927c0fd9f649e501240501abc2acfe493be0aceb4eca66",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/auren-warrior-tripo-p2-v1_75223405.glb": {
    modelUrl: "/manus-storage/auren-warrior-tripo-p2-v1-beta-512_9430d082.glb",
    sourceBytes: 677_456,
    originalSourceBytes: 3_073_496,
    derivativeBytes: 677_456,
    sha256: "89eab18978ab44423cac2b901feb2a03983dc98e7bb6bb8e98f864f9a6e76a07",
    originalSha256:
      "2217a5d5e49668685bc220d12c485ebcd9a47163bfb23f8f54b809d24355e0fb",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/dravok-archer-tripo-p2-v1_36b23044.glb": {
    modelUrl: "/manus-storage/dravok-archer-tripo-p2-v1-beta-512_611550a4.glb",
    sourceBytes: 621_576,
    originalSourceBytes: 2_861_332,
    derivativeBytes: 621_576,
    sha256: "57e474cc524938892a7d0b676ba3e866cf919ae5279b059bb23a61595303c500",
    originalSha256:
      "47b990aff4f86cbb14cee60c66bb793ddc6a55b0b1bf8bd9083ebda1c5f3639c",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/dravok-borvak-tripo-p2-v1_039d22a8.glb": {
    modelUrl: "/manus-storage/dravok-borvak-tripo-p2-v1-beta-512_82ed7b2b.glb",
    sourceBytes: 752_412,
    originalSourceBytes: 3_509_108,
    derivativeBytes: 752_412,
    sha256: "24a5eaa0035c4e9e7e4ecb3b34c7911086550bbcf0ca6942484d0d45e47c7efd",
    originalSha256:
      "8c702d17d6e6630b36ce49e942b8634ce52a97da2b5f667aecf4548025092229",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/dravok-bulwark-tripo-p2-v1_17deec7d.glb": {
    modelUrl: "/manus-storage/dravok-bulwark-tripo-p2-v1-beta-512_23f945d0.glb",
    sourceBytes: 696_336,
    originalSourceBytes: 3_310_528,
    derivativeBytes: 696_336,
    sha256: "a384153900d727cf2c1ac6a8dca3b73faaf49a82c20bb3c01070ed4cf73e6818",
    originalSha256:
      "4c8899290cf3297d2385c861d1961a97f39def6d810b7caf7415e30c42d16f00",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/dravok-defender-tripo-p2-v1_f9f69e23.glb": {
    modelUrl:
      "/manus-storage/dravok-defender-tripo-p2-v1-beta-512_65ec4da0.glb",
    sourceBytes: 600_112,
    originalSourceBytes: 3_246_060,
    derivativeBytes: 600_112,
    sha256: "393e4330b198c55d5a236ec55a27b76dbf107051c795184c42ff3af8925dc281",
    originalSha256:
      "65bf8cc54d45d38a4170d9ef8d72faefd878e20aec124efa0e38582b0dcea314",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/dravok-rider-tripo-p2-v1_296fcc0d.glb": {
    modelUrl: "/manus-storage/dravok-rider-tripo-p2-v1-beta-512_42b2fbb1.glb",
    sourceBytes: 466_896,
    originalSourceBytes: 2_807_708,
    derivativeBytes: 466_896,
    sha256: "aba8235c34055fde9d67d558f2cc6477c50fe1aad2f98faca892dc50c5c24c5c",
    originalSha256:
      "f6d975b2d9be7221cb7420ab1b537e7e8f10ffaabec20f17f49263f6328d8ed4",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/dravok-warrior-tripo-p2-v1_881c5daf.glb": {
    modelUrl: "/manus-storage/dravok-warrior-tripo-p2-v1-beta-512_afc409a9.glb",
    sourceBytes: 627_992,
    originalSourceBytes: 3_162_552,
    derivativeBytes: 627_992,
    sha256: "2b164b99a798cc1e32ed524915e23a4d06eabcb791dd8b88487a34421b6a8fdf",
    originalSha256:
      "45205915d34d160c0f6a536ca9504ec529c8926d24ec869207ba2bc08db77649",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/kharzul-archer-tripo-p2-v1_8ff6d78c.glb": {
    modelUrl: "/manus-storage/kharzul-archer-tripo-p2-v1-beta-512_9c6addd0.glb",
    sourceBytes: 751_632,
    originalSourceBytes: 3_330_404,
    derivativeBytes: 751_632,
    sha256: "11caedc76175449cf323bd8de190a8f36338324b2b09aea63b7df34077e3ffe6",
    originalSha256:
      "aac409be47a85c557a059dd2b118348c666252dc2fbe7febeb8cb30ca13a37ad",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/kharzul-berserker-tripo-p2-v1_dac5bf8a.glb": {
    modelUrl:
      "/manus-storage/kharzul-berserker-tripo-p2-v1-beta-512_79477938.glb",
    sourceBytes: 789_384,
    originalSourceBytes: 3_623_140,
    derivativeBytes: 789_384,
    sha256: "09fdc2b08ddf5f6a4abff69bacbfc8e24feb2a1c9a9d87c353e80b12ebceda53",
    originalSha256:
      "5a938dacaaf2048e31fd74cf9c944ef460233983f57b35c13e2207d822a251e5",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/kharzul-defender-tripo-p2-v1_15e05ad1.glb": {
    modelUrl:
      "/manus-storage/kharzul-defender-tripo-p2-v1-beta-512_87270df5.glb",
    sourceBytes: 556_476,
    originalSourceBytes: 2_881_528,
    derivativeBytes: 556_476,
    sha256: "ca6452c453cb6a93b757bc5436fd89de61e08710ef2e8807e256d91e03dd3e68",
    originalSha256:
      "d0f125f0ef7ccd352607b298e129d311a3f8031015b6b0a098509b2f096b69ad",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/kharzul-drukhar-tripo-p2-v1_5e9069d5.glb": {
    modelUrl:
      "/manus-storage/kharzul-drukhar-tripo-p2-v1-beta-512_203c6447.glb",
    sourceBytes: 821_924,
    originalSourceBytes: 3_809_500,
    derivativeBytes: 821_924,
    sha256: "11fca66854b6d238bbbb1dfc1c3da7961e13f35174b8af475401c402bacd2131",
    originalSha256:
      "1629ee29213f01d149dd88c6bf51daa263b2afae4553ade14a0e2f2a5f1360c9",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/kharzul-rider-tripo-p2-v1_2b25fb34.glb": {
    modelUrl: "/manus-storage/kharzul-rider-tripo-p2-v1-beta-512_fc5dc96e.glb",
    sourceBytes: 786_408,
    originalSourceBytes: 3_616_972,
    derivativeBytes: 786_408,
    sha256: "7bf7d6bf8da85d432566788712fb61b9fbb4105fa9d4e27598829f2f500494d7",
    originalSha256:
      "67baeeddc23e0f49447f6f15a834f462c0fb35474b43569722563cf31201bf71",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/kharzul-warrior-tripo-p2-v1_0dfbcc82.glb": {
    modelUrl:
      "/manus-storage/kharzul-warrior-tripo-p2-v1-beta-512_c187a145.glb",
    sourceBytes: 707_296,
    originalSourceBytes: 3_368_484,
    derivativeBytes: 707_296,
    sha256: "eff5e0e564da45834772e41e6c1eecd6f4bde1c4b749bb9e3720951c4382c6c4",
    originalSha256:
      "b5ca61d9cd659f7a5c23066cb0ca0c0d42a61c92e9cd35340e95a038eb00000f",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/mycelon-archer-tripo-p2-v1_8fa3590e.glb": {
    modelUrl: "/manus-storage/mycelon-archer-tripo-p2-v1-beta-512_ad4f14ef.glb",
    sourceBytes: 721_584,
    originalSourceBytes: 3_452_104,
    derivativeBytes: 721_584,
    sha256: "3b547e76a4d786e6b199b96bcaeded32ec428b300a622dac057acccb3253410d",
    originalSha256:
      "954cea15bb2c7b7b282f4e7a0dcc920f5d5a4f54a317a678e349a154ae99d526",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/mycelon-defender-tripo-p2-v1_225e0a80.glb": {
    modelUrl:
      "/manus-storage/mycelon-defender-tripo-p2-v1-beta-512_a2f0529b.glb",
    sourceBytes: 658_284,
    originalSourceBytes: 3_056_332,
    derivativeBytes: 658_284,
    sha256: "9f68dfc16a73bea30db8a4f1e4d6cabd4b70e87fd8ab665f0d7cdcfd51cc7636",
    originalSha256:
      "80b156e4c769f81a6fcbea7d054da70f2e48c2753ad087ff13c58db5df80b0ec",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/mycelon-morel-tripo-p2-v1_aa065466.glb": {
    modelUrl: "/manus-storage/mycelon-morel-tripo-p2-v1-beta-512_3983329c.glb",
    sourceBytes: 780_220,
    originalSourceBytes: 3_633_000,
    derivativeBytes: 780_220,
    sha256: "82c2892b649fd4214911ef1b86bba7c22cca7a1732d82a2b7bb843c8049e49c3",
    originalSha256:
      "69dd9f053002d826f44f0beed1d84c1ee8e7b8e16b528769019e338c433a1b1f",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/mycelon-rider-tripo-p2-v1_2190494a.glb": {
    modelUrl: "/manus-storage/mycelon-rider-tripo-p2-v1-beta-512_60c18cab.glb",
    sourceBytes: 717_016,
    originalSourceBytes: 3_294_512,
    derivativeBytes: 717_016,
    sha256: "8b52d9b13531f2061c8d2a95f16b1635b320b7e0ada784070c00515e171be9c7",
    originalSha256:
      "b74a4922fb3a4a0fdf13a345327f0d93f9b48df1a7f2b4dcad8ea336ef89556e",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/mycelon-warrior-tripo-p2-v1_786024e4.glb": {
    modelUrl:
      "/manus-storage/mycelon-warrior-tripo-p2-v1-beta-512_088c659c.glb",
    sourceBytes: 503_236,
    originalSourceBytes: 2_504_068,
    derivativeBytes: 503_236,
    sha256: "3c0ddbbadf8762a5e1c0ee5f07be058cbfbdbcbd1542910ac7569e5835044fde",
    originalSha256:
      "9b4bccab72d57a34bb21e137d0f08af9a9c2cd0524840c411120dbaa9a6196c2",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/nerivane-archer-tripo-p2-v1_6578b495.glb": {
    modelUrl:
      "/manus-storage/nerivane-archer-tripo-p2-v1-beta-512_d936bb2d.glb",
    sourceBytes: 644_852,
    originalSourceBytes: 2_788_280,
    derivativeBytes: 644_852,
    sha256: "ab4d70e744648c2f874865fae4d0e0e0c2b2101436513ffeb075ffc70cb2b2d5",
    originalSha256:
      "b9965b4fb463610cac9fae4dc65429bf4900b52e0ef5a555a914d8870a0e3a71",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/nerivane-defender-tripo-p2-v1_5c6aee77.glb": {
    modelUrl:
      "/manus-storage/nerivane-defender-tripo-p2-v1-beta-512_39c1cf2b.glb",
    sourceBytes: 684_672,
    originalSourceBytes: 3_042_840,
    derivativeBytes: 684_672,
    sha256: "55d5aebea0a07315a3161e9e82a22c5ac9ee9208dde670d5c40281d1c8518b65",
    originalSha256:
      "1c63335a1d0b882d1848ba58b83678a0a495daed166f9490c4fe14d76f500b23",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/nerivane-nereth-tripo-p2-v1_0847ff85.glb": {
    modelUrl:
      "/manus-storage/nerivane-nereth-tripo-p2-v1-beta-512_6204da3c.glb",
    sourceBytes: 723_772,
    originalSourceBytes: 3_124_068,
    derivativeBytes: 723_772,
    sha256: "146a03a3f811b348784fea07d6d6463f9c59b9917b4686857859d589fa952daf",
    originalSha256:
      "cb3a38bfea0d74febac02a65d96bb6b429c78af3e3ddab7108944b0cd459b336",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/nerivane-rider-tripo-p2-v2_b6bf26e0.glb": {
    modelUrl: "/manus-storage/nerivane-rider-tripo-p2-v2-beta-512_2ed595dd.glb",
    sourceBytes: 611_696,
    originalSourceBytes: 2_785_372,
    derivativeBytes: 611_696,
    sha256: "66c5ab541aef35ca6641045a3d3e98fb2e11a1b59ae3e6fe493ac6d1953bd5b6",
    originalSha256:
      "7fe5451a2bf0630d50026eeecb051f813a65dc8fd2e596a643bf3c8b06d4c2d3",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/nerivane-tidecaller-tripo-p2-v1_7816d57c.glb": {
    modelUrl:
      "/manus-storage/nerivane-tidecaller-tripo-p2-v1-beta-512_92a16eeb.glb",
    sourceBytes: 447_356,
    originalSourceBytes: 2_217_220,
    derivativeBytes: 447_356,
    sha256: "df0a439808c8134ea41ab3d95546990f9f59bb9fffb4d02a89d6d6b74e50994b",
    originalSha256:
      "d24a312ba474a37b1c5dc5aafd41f37899c2ccbbc5b6306c355cc1f270b7e443",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/nerivane-warrior-tripo-p2-v1_a1ae73c5.glb": {
    modelUrl:
      "/manus-storage/nerivane-warrior-tripo-p2-v1-beta-512_409141e3.glb",
    sourceBytes: 601_740,
    originalSourceBytes: 2_413_564,
    derivativeBytes: 601_740,
    sha256: "d6ca8b4c5bdc0f2071a2fe353a6667e6530166b2a81c5b13d191b25592aa16d0",
    originalSha256:
      "4321b46367d64a77f97847fa858d16a8b53df07efc0e34e71595c8b6403e4b2e",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/sunwei-archer-tripo-p2-v1_580bcfff.glb": {
    modelUrl: "/manus-storage/sunwei-archer-tripo-p2-v1-beta-512_cf7f25e0.glb",
    sourceBytes: 654_156,
    originalSourceBytes: 2_811_944,
    derivativeBytes: 654_156,
    sha256: "44acf1c7bdd6402059ee6454e68eb50b4f4cdb5be754b3a640acb35d04df47e8",
    originalSha256:
      "911c639ccd44a827c74775d5c76741c26a02b1e44132518da1ea566d73128a9c",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/sunwei-defender-tripo-p2-v1_e386fdc1.glb": {
    modelUrl:
      "/manus-storage/sunwei-defender-tripo-p2-v1-beta-512_e33b85b6.glb",
    sourceBytes: 646_168,
    originalSourceBytes: 3_072_148,
    derivativeBytes: 646_168,
    sha256: "ee5d19a3aebe2496c7b76c833fdba1c948e00167a61ea89d58af15c023290377",
    originalSha256:
      "e958fdef90e45f097bfcd0d65fe29fc03a6fe59d10a0a2f43f966f7c7d897967",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/sunwei-rider-tripo-p2-v1_ccc4c855.glb": {
    modelUrl: "/manus-storage/sunwei-rider-tripo-p2-v1-beta-512_2a7d5e5d.glb",
    sourceBytes: 822_912,
    originalSourceBytes: 3_600_564,
    derivativeBytes: 822_912,
    sha256: "56a83889128ed40b740b706e402ab1130937ad3ebbb94759bedb24d692382c2c",
    originalSha256:
      "08187d94fc3a09878c1cd6e335db010dc59e4c19638f03f95a89a7b5c2e16328",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/sunwei-sunwarden-tripo-p2-v1_53de92df.glb": {
    modelUrl:
      "/manus-storage/sunwei-sunwarden-tripo-p2-v1-beta-512_0b389b35.glb",
    sourceBytes: 834_392,
    originalSourceBytes: 3_852_780,
    derivativeBytes: 834_392,
    sha256: "d426e64c2ff41efaf5c28ec02e1a20b9cd2aa9e0d222feb2914a5ff97ff2c2af",
    originalSha256:
      "28ae7e793a2f108845c3253b22f4dc0c9000532c0ade3f01f7f9a85896376b52",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/sunwei-warrior-tripo-p2-v1_af991702.glb": {
    modelUrl: "/manus-storage/sunwei-warrior-tripo-p2-v1-beta-512_a0a4b656.glb",
    sourceBytes: 702_228,
    originalSourceBytes: 3_171_352,
    derivativeBytes: 702_228,
    sha256: "0a56e150d64f3102e4f77453efa39c328e6ee9963a0a40b875e17010a9a1ffb5",
    originalSha256:
      "04b706f5410f9950792a2801c363099155cc8333012ab576c213c2af96696ab9",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/sunwei-wu-jian-tripo-p2-v1_3c76da9b.glb": {
    modelUrl: "/manus-storage/sunwei-wu-jian-tripo-p2-v1-beta-512_ab7780dc.glb",
    sourceBytes: 736_572,
    originalSourceBytes: 3_253_736,
    derivativeBytes: 736_572,
    sha256: "75afc011ded722b285c0dd0747ba423660a84c104a80a42b3b7cefa3fa167a66",
    originalSha256:
      "659f4dec4cc46e435dec6ef1836a572cd8d46c62ffe1529c1e19bf3395373680",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/valkyra-archer-tripo-p2-v1_616c7c8e.glb": {
    modelUrl: "/manus-storage/valkyra-archer-tripo-p2-v1-beta-512_be927f22.glb",
    sourceBytes: 658_512,
    originalSourceBytes: 3_068_676,
    derivativeBytes: 658_512,
    sha256: "2609175dd058cadf79226d1f9f9bf61dcf41fa60db3e96b23eb5f50683e8c9b7",
    originalSha256:
      "3a297e38aca94c27b0aeb24b5c992498d18060752fd430669f9fc2d455ddb4d2",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/valkyra-defender-tripo-p2-v1_02d56868.glb": {
    modelUrl:
      "/manus-storage/valkyra-defender-tripo-p2-v1-beta-512_aa9bdf51.glb",
    sourceBytes: 737_088,
    originalSourceBytes: 3_652_184,
    derivativeBytes: 737_088,
    sha256: "163bdc09fb214a5113c6b358bb054e46dc5aff48d7aa88fbee815105445af120",
    originalSha256:
      "c8b022ba862d54478c2ff90cf3fa22188d02ee41b6c8422bddc0d7f0f4230e0f",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/valkyra-rider-tripo-p2-v1_16fb5bf0.glb": {
    modelUrl: "/manus-storage/valkyra-rider-tripo-p2-v1-beta-512_4a47d0ff.glb",
    sourceBytes: 778_252,
    originalSourceBytes: 3_377_620,
    derivativeBytes: 778_252,
    sha256: "cbb6d958acdd642f019132943dd3f4200a3b2ba2fd971cb0b759dd3e87116a92",
    originalSha256:
      "02f42898ecb4a2a3f3f22240b0685a11f6ad09592b61b22236b2d10abd776de0",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/valkyra-skadi-tripo-p2-v1_80cb7846.glb": {
    modelUrl: "/manus-storage/valkyra-skadi-tripo-p2-v1-beta-512_1a902e46.glb",
    sourceBytes: 759_964,
    originalSourceBytes: 3_376_220,
    derivativeBytes: 759_964,
    sha256: "c92124f525f8f158fbef80ba8ba2be8fe8f3695e83fd6042447a8f9f68acf6f6",
    originalSha256:
      "6bd7cf15817f4a53b15324cb617b96ebf85bfe9afce02b12ffc2b1ec1a93ebe1",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/valkyra-warrior-tripo-p2-v1_051262b9.glb": {
    modelUrl:
      "/manus-storage/valkyra-warrior-tripo-p2-v1-beta-512_bbba976f.glb",
    sourceBytes: 552_184,
    originalSourceBytes: 3_039_560,
    derivativeBytes: 552_184,
    sha256: "646a5e8da83c72c9ad45234d6c40ab0f64f80c7f9c70e940f84e216a144e5d34",
    originalSha256:
      "6fd2f9e790c4a9c4c6badf3ce10dbf707bcb5fe378dc8269772ef2d6d31d9462",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/vessari-archer-tripo-p2-v1_a629c752.glb": {
    modelUrl: "/manus-storage/vessari-archer-tripo-p2-v1-beta-512_82287ee5.glb",
    sourceBytes: 714_720,
    originalSourceBytes: 3_340_612,
    derivativeBytes: 714_720,
    sha256: "cddb370325d68387c52420f02595c69f538b869cf04c3196b4503d3483a5f19d",
    originalSha256:
      "5a5cec4f677d8711f8613a4ec2ea387dae7418ab72196491039f121ce081fb7a",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/vessari-defender-tripo-p2-v1_333cf8da.glb": {
    modelUrl:
      "/manus-storage/vessari-defender-tripo-p2-v1-beta-512_61de1a0c.glb",
    sourceBytes: 698_672,
    originalSourceBytes: 3_163_676,
    derivativeBytes: 698_672,
    sha256: "818ef3431037752d9b82f366ff6bee00480097e04f92bcb4e712378f5af2c9fe",
    originalSha256:
      "416daa9f5ebb053763fb8509e541c304d510d77d8794297ebaeaa071817c1768",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/vessari-raider-tripo-p2-v1_1999984e.glb": {
    modelUrl: "/manus-storage/vessari-raider-tripo-p2-v1-beta-512_96682bb0.glb",
    sourceBytes: 835_980,
    originalSourceBytes: 3_510_336,
    derivativeBytes: 835_980,
    sha256: "be131194f9feeecff91c0d271557364e589e9fb583fdf0b4fb0410384c49d349",
    originalSha256:
      "daf3e6180ee96e5994799aa9f78a48bdb323889cb55eac1de5073aed3f7889f9",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/vessari-rider-tripo-p2-v1_d1b5684e.glb": {
    modelUrl: "/manus-storage/vessari-rider-tripo-p2-v1-beta-512_75a84109.glb",
    sourceBytes: 816_352,
    originalSourceBytes: 3_519_888,
    derivativeBytes: 816_352,
    sha256: "07b0615d5fb7ccf62e372a50d42f4883c7e4956dd395045bc0a8e66bf7223d46",
    originalSha256:
      "1b144911405ef232ac0a7324c2b6a0f85105071ece493adaa702387fe3ff7e80",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/vessari-szara-tripo-p2-v1_acff22d2.glb": {
    modelUrl: "/manus-storage/vessari-szara-tripo-p2-v1-beta-512_8e2a9b64.glb",
    sourceBytes: 751_056,
    originalSourceBytes: 3_254_112,
    derivativeBytes: 751_056,
    sha256: "4ca534b24a3c0593edf9ebd41afae4a7e430b98291ceaa11214eb6ba058f89af",
    originalSha256:
      "0920c9c696b0be4e9894833ad0ddd1f5ff0419e7bd77357f92a85e8d9d8a80a4",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
  "/manus-storage/vessari-warrior-tripo-p2-v1_88434b73.glb": {
    modelUrl:
      "/manus-storage/vessari-warrior-tripo-p2-v1-beta-512_c40e90dd.glb",
    sourceBytes: 694_212,
    originalSourceBytes: 3_035_204,
    derivativeBytes: 694_212,
    sha256: "db04ad1978cdcc51fb47566a3c246e1bb2ee7619817d9584636089e7019909d3",
    originalSha256:
      "b840063159f8d276f2bab4bb56f188cbaacf7bda1092dd7da1dba719d5745824",
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
  },
} as const satisfies Readonly<
  Record<ManagedStorageGlbUrl, BetaVisualModelDerivative>
>;

/**
 * A deliberately nullable lookup so opt-in callers can retain the procedural
 * renderer whenever a model was not audited for this beta.
 */
export function betaVisualModelFor(
  originalModelUrl: string
): BetaVisualModelDerivative | null {
  return (
    BETA_VISUAL_MODELS[originalModelUrl as keyof typeof BETA_VISUAL_MODELS] ??
    null
  );
}
