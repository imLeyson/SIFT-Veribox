export function mockCanvasChat(
  message: string,
  selectedId: string | null
): {
  reply: string;
  cards: { title: string; body: string; parentId: string | null }[];
} {
  return {
    reply: "先在这条分支上把材质和结构分开看，避免又做成「好看的茶包装合集」。",
    cards: [
      {
        title: "材质切口",
        body: `围绕「${message.slice(0, 24)}」先只看纸、金属、玻璃的触感和边缘，不看插画。`,
        parentId: selectedId,
      },
      {
        title: "结构切口",
        body: "罐、纸套、外盒三层各只承担一件事：识别、仪式、配送保护。",
        parentId: selectedId,
      },
    ],
  };
}
