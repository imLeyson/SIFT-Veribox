export function mockCanvasChat(
  message: string,
  selectedId: string | null
): {
  intent: "answer" | "ask" | "edit" | "compare" | "deepen";
  reply: string;
  questions: {
    id: string;
    prompt: string;
    options: { id: string; label: string; rationale?: string }[];
  }[];
  cards: { title: string; body: string; parentId: string | null }[];
} {
  const text = message.trim();
  const deepen =
    /深化|接着往下|再拆|加一|新增卡片|给我 2 个|马上打开网站/.test(text);
  const ask = /帮我选|不确定|哪个更|先看哪/.test(text);
  const question = /为什么|什么意思|怎么用|解释|是什么|这是啥/.test(text);

  if (ask && !deepen) {
    return {
      intent: "ask",
      reply: "先定这一步看哪边，后面关键词会跟着变。",
      questions: [
        {
          id: "chat_q1",
          prompt: "这一步更想看哪边？",
          options: [
            { id: "a", label: "国内实际案例", rationale: "更接近上线环境" },
            { id: "b", label: "完整项目页", rationale: "更容易看整套怎么做完" },
          ],
        },
      ],
      cards: [],
    };
  }

  if (question && !deepen) {
    return {
      intent: "answer",
      reply: "先看这一步要解决什么不确定。词跟着对象走，不要先搜氛围。",
      questions: [],
      cards: [],
    };
  }

  if (deepen) {
    return {
      intent: "deepen",
      reply: "从当前卡片往下拆两个能马上搜的方向。",
      questions: [],
      cards: [
        {
          title: "先看材质",
          body: `这一轮只搜纸、玻璃、金属的边缘和手感。\n小红书：${text.slice(0, 12)} 材质\nPinterest：stone glass vessel\n先别搜场景。`,
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

  return {
    intent: "answer",
    reply: "可以。把要改的词或步骤说具体一点。",
    questions: [],
    cards: [],
  };
}
