import {useEffect, useRef, useState} from 'react';
import {Send} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {Prism as SyntaxHighlighter} from "react-syntax-highlighter";
import {vscDarkPlus} from "react-syntax-highlighter/dist/esm/styles/prism"
import {GoogleGenerativeAI} from "@google/generative-ai";
import {Button} from "@mui/material";

const genAi = new GoogleGenerativeAI("XXXXXXXXXXXXXXXXXXXXXXXXX"); //removed the original one for security reasons
const model = genAi.getGenerativeModel({model: "gemini-1.5-flash"});

const Chat = () => {
    const [messages, setMessages] = useState([
        {sender: `user`, text: "Hello"},
        {sender: `ai`, text: "Hello, how are you today?"}
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messageEndRef = useRef(null);
    const chatSessionRef = useRef(null);


    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({behavior: "smooth"})
    }

    useEffect(() => {
        scrollToBottom();

        if (!chatSessionRef.current) {
            chatSessionRef.current = model.startChat({
                    generationConfig: {
                        temperature: 0.9,
                        topK: 1,
                        topP: 1,
                        maxOutputTokens: 2048,
                    },
                    history: [],
                }
            );
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setMessages(prev => [...prev, {sender: "user", text: input}]);
        setInput("");
        setIsTyping(true);

        try {
            let fullResponse = ""
            const result = await chatSessionRef.current.sendMessageStream(input);

            setMessages(prev => [...prev, {sender: "ai", text: "", isGenerating: true}]);

            for await (const chunk of result.stream) {
                const chunkText = chunk.text()
                fullResponse += chunkText

                setMessages(prev => [...prev.slice(0, -1), {sender: "ai", text: fullResponse, isGenerating: true}]);
            }
            setMessages(prev => [...prev.slice(0, -1), {sender: "ai", text: fullResponse, isGenerating: false}]);
            setIsTyping(false);

        } catch (e) {
            console.log(e);
            setIsTyping(false);
            setMessages(prev => [...prev, {sender: "ai", text: "Sorry there was an error", isGenerating: false}]);

        }
    }


    const MarkdownComponent = {
        code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || "")
            return !inline && match ? (
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}>
                    {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }
    }

    return (
        <div className="flex flex-col h-screen bg-grey-100">
            <style jsx global></style>
            <header className="bg-blue-600 text-white p-4">
                <h1 className="text-2xl font-bold">Gemni Chat</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {
                    messages.map((message, index) => (
                        <div key={index}
                             className={`mb-4 ${message.sender === "user" ? "text-right" : "text-left"}`}>

                            <div
                                className={`inline-block p-2 rounded-lg ${message.sender === "user" ? "bg-blue-500 text-white" : "ai-message"}`}>
                                {message.sender === "user"
                                    ? (message.text)
                                    : (<ReactMarkdown
                                        className={`prose max-w-nome ${message.isGenerating ? "typing-animation" : ""}`}
                                        components={MarkdownComponent}>
                                        {message.text || "Thinking..."}
                                    </ReactMarkdown>)
                                }
                            </div>

                        </div>
                    ))
                }

                {isTyping && (
                    <div className={"text-left"}>
                        <div className="inline-block p-2 rounded-lg bg-gray-300">
                            Typing...
                        </div>
                    </div>
                )}

                <div ref={messageEndRef}/>
            </div>

            <form onSubmit={handleSubmit} className="p-4 bg-white">
                <div className="flex items-center">
                    <input type="text" className="flex-1 p-2 border rounded-1-lg focus:outline-none"
                           value={input}
                           placeholder="Type a message..."
                           onChange={(e) => setInput(e.target.value)}></input>
                    <Button className="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none">
                        <Send size={24}/>
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Chat;
