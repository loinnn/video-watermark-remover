export interface SampleVideo {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  description: string;
  defaultRegions?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  }>;
}

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: 'sample-landscape',
    name: '风景示例（角落水印）',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    description: '高清自然风光短片，包含右上角品牌 Logo 水印',
    defaultRegions: [
      { x: 78, y: 5, width: 18, height: 10, label: '右上角水印' }
    ]
  },
  {
    id: 'sample-city',
    name: '城市快闪（多区域文字水印）',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f30ac4fe00?auto=format&fit=crop&w=400&q=80',
    description: '城市风光短视频，包含底部字幕与右上角时间印章',
    defaultRegions: [
      { x: 75, y: 8, width: 20, height: 9, label: '右上标识' },
      { x: 30, y: 82, width: 40, height: 12, label: '底部文字' }
    ]
  }
];
