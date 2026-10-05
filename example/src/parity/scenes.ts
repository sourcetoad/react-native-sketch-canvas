import type {
  CanvasText,
  LocalSourceImage,
  Path,
} from '@sourcetoad/react-native-sketch-canvas';

export const CANVAS_SIZE = 300;

export type Stroke = {
  id: number;
  color: string;
  width: number;
  points: [number, number][];
};

export type ExportOptions = {
  imageType: 'png' | 'jpg';
  transparent: boolean;
  includeImage: boolean;
  includeText: boolean;
  cropToImageSize: boolean;
};

export type SceneTrigger = 'ready' | 'initialPaths' | 'image';

export type Scene = {
  id: string;
  trigger: SceneTrigger;
  strokes?: Stroke[];
  addPaths?: Stroke[];
  initialPaths?: Stroke[];
  text?: CanvasText[];
  imageMode?: NonNullable<LocalSourceImage['mode']>;
  export?: Partial<ExportOptions>;
};

export const DEFAULT_EXPORT: ExportOptions = {
  imageType: 'png',
  transparent: false,
  includeImage: true,
  includeText: true,
  cropToImageSize: false,
};

export const exportOptionsOf = (scene: Scene): ExportOptions => ({
  ...DEFAULT_EXPORT,
  ...scene.export,
});

export const toPath = (stroke: Stroke): Path => ({
  drawer: 'parity',
  size: { width: CANVAS_SIZE, height: CANVAS_SIZE },
  path: {
    id: stroke.id,
    color: stroke.color,
    width: stroke.width,
    data: stroke.points.map(([x, y]) => `${x},${y}`),
  },
});

const zigzag = (
  left: number,
  right: number,
  top: number,
  bottom: number,
  teeth: number
): [number, number][] =>
  Array.from({ length: teeth * 2 + 1 }, (_, i) => [
    left + ((right - left) * i) / (teeth * 2),
    i % 2 === 0 ? top : bottom,
  ]);

const ERASER = '#00000000';

const OPAQUE_STROKES: Stroke[] = [
  { id: 101, color: '#FF0000', width: 4, points: zigzag(20, 280, 20, 90, 5) },
  {
    id: 102,
    color: '#00AA00',
    width: 10,
    points: zigzag(20, 280, 110, 180, 4),
  },
  {
    id: 103,
    color: '#0000FF',
    width: 20,
    points: zigzag(20, 280, 200, 280, 3),
  },
];

const IMAGE_STROKE: Stroke = {
  id: 301,
  color: '#FF0000',
  width: 6,
  points: zigzag(30, 270, 60, 240, 3),
};

const TEXT_ON_IMAGE: CanvasText[] = [
  {
    text: 'Parity\nwhale',
    fontSize: 22,
    fontColor: '#000080',
    position: { x: 0.5, y: 0.2 },
    coordinate: 'Ratio',
    anchor: { x: 0.5, y: 0.5 },
    alignment: 'Center',
  },
];

export const SCENES: Scene[] = [
  { id: 'blank', trigger: 'ready' },
  { id: 'strokes', trigger: 'ready', strokes: OPAQUE_STROKES },
  {
    id: 'translucent',
    trigger: 'ready',
    strokes: [
      {
        id: 201,
        color: '#000000',
        width: 8,
        points: [
          [20, 150],
          [150, 140],
          [280, 160],
        ],
      },
      {
        id: 202,
        color: '#FF000080',
        width: 24,
        points: [
          [40, 40],
          [260, 260],
          [260, 40],
          [40, 260],
          [40, 40],
        ],
      },
    ],
  },
  {
    id: 'eraser-live',
    trigger: 'ready',
    strokes: [
      {
        id: 211,
        color: '#000000',
        width: 40,
        points: zigzag(30, 270, 40, 260, 2),
      },
      {
        id: 212,
        color: ERASER,
        width: 20,
        points: [
          [10, 150],
          [290, 150],
        ],
      },
    ],
  },
  {
    id: 'add-path',
    trigger: 'ready',
    addPaths: [
      {
        id: 221,
        color: '#0000FF',
        width: 12,
        points: zigzag(20, 280, 30, 270, 3),
      },
      {
        id: 222,
        color: ERASER,
        width: 16,
        points: [
          [10, 150],
          [80, 130],
          [150, 170],
          [220, 130],
          [290, 150],
        ],
      },
    ],
  },
  {
    id: 'initial-paths',
    trigger: 'initialPaths',
    initialPaths: [
      {
        id: 231,
        color: '#FF00FF',
        width: 8,
        points: zigzag(20, 280, 20, 120, 4),
      },
      {
        id: 232,
        color: '#00FFFF80',
        width: 30,
        points: zigzag(20, 280, 100, 200, 2),
      },
      {
        id: 233,
        color: '#000000',
        width: 3,
        points: zigzag(20, 280, 180, 280, 6),
      },
    ],
  },
  {
    id: 'image-aspectfill',
    trigger: 'image',
    imageMode: 'AspectFill',
    strokes: [IMAGE_STROKE],
  },
  {
    id: 'image-aspectfit',
    trigger: 'image',
    imageMode: 'AspectFit',
    strokes: [IMAGE_STROKE],
  },
  {
    id: 'image-scaletofill',
    trigger: 'image',
    imageMode: 'ScaleToFill',
    strokes: [IMAGE_STROKE],
  },
  {
    id: 'text-options',
    trigger: 'ready',
    strokes: [
      {
        id: 241,
        color: '#FFCC00',
        width: 16,
        points: [
          [10, 10],
          [290, 290],
        ],
      },
      {
        id: 242,
        color: '#00AA00',
        width: 16,
        points: [
          [290, 10],
          [10, 290],
        ],
      },
    ],
    text: [
      {
        text: 'TextOnSketch\nLeft aligned',
        fontSize: 20,
        fontColor: '#0000FF',
        overlay: 'TextOnSketch',
        alignment: 'Left',
        coordinate: 'Absolute',
        position: { x: 10, y: 10 },
      },
      {
        text: 'SketchOnText\nCentered\nline height 1.5',
        fontSize: 18,
        fontColor: '#AA00AA',
        overlay: 'SketchOnText',
        alignment: 'Center',
        coordinate: 'Ratio',
        position: { x: 0.5, y: 0.5 },
        anchor: { x: 0.5, y: 0.5 },
        lineHeightMultiple: 1.5,
      },
      {
        text: 'Right\naligned text',
        fontSize: 24,
        fontColor: '#AA0000',
        overlay: 'TextOnSketch',
        alignment: 'Right',
        coordinate: 'Absolute',
        position: { x: 290, y: 290 },
        anchor: { x: 1, y: 1 },
      },
    ],
  },
  {
    id: 'text-omitted',
    trigger: 'ready',
    strokes: [
      {
        id: 251,
        color: '#000000',
        width: 6,
        points: zigzag(20, 280, 80, 280, 4),
      },
    ],
    text: [
      { text: 'Omitted fields', position: { x: 20, y: 20 }, fontSize: 20 },
    ],
  },
  {
    id: 'export-transparent',
    trigger: 'image',
    imageMode: 'AspectFit',
    strokes: OPAQUE_STROKES,
    export: { transparent: true, includeImage: false },
  },
  {
    id: 'export-crop',
    trigger: 'image',
    imageMode: 'AspectFit',
    strokes: OPAQUE_STROKES,
    text: TEXT_ON_IMAGE,
    export: { cropToImageSize: true },
  },
  {
    id: 'export-no-image-no-text',
    trigger: 'image',
    imageMode: 'AspectFill',
    strokes: OPAQUE_STROKES,
    text: TEXT_ON_IMAGE,
    export: { includeImage: false, includeText: false },
  },
];
