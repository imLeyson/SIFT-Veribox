export function mockCanvasChat(
  message: string,
  selectedId: string | null
): {
  reply: string;
  cards: { title: string; body: string; parentId: string | null }[];
} {
  return {
    reply: "别一上来搜氛围图。先把材质和结构分开看。",
    cards: [
      {
        title: "先看材质",
        body: `这一轮只搜纸、玻璃、金属的边缘和手感。\n小红书：${message.slice(0, 12)} 材质\nPinterest：stone glass vessel\n先别搜场景。`,
        parentId: selectedId,
      },
      {
        title: "先看结构",
        body: "罐、纸套、外盒分开搜。每层只干一件事：认出是谁、好不好拿、好不好寄。",
        parentId: selectedId,
      },
    ],
  };
}
