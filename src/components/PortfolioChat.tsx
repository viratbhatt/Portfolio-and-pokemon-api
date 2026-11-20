import { useEffect, useRef, useState } from 'react'
import {
  askPortfolioAssistant,
  type ChatMessage,
  type ConversationContext,
} from '../services/portfolioAssistant'
import './PortfolioChat.css'

type DisplayMessage = ChatMessage & { id: number }

interface SpeechRecognitionResultLike {
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const speechWindow = window as SpeechRecognitionWindow
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
}

const suggestedQuestions = [
  'What are Virat’s strongest skills?',
  'Tell me about Virat’s recent experience.',
  'What projects has Virat built?',
]

export default function PortfolioChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported] = useState(() => Boolean(getSpeechRecognitionConstructor()))
  const nextMessageId = useRef(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const conversationContextRef = useRef<ConversationContext>({ summary: '', summarizedMessageCount: 0 })
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const voiceInputStartRef = useRef('')

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !messagesRef.current) return
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [isOpen, isLoading, messages])

  useEffect(() => () => {
    abortRef.current?.abort()
    recognitionRef.current?.abort()
  }, [])

  function toggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition || isLoading) return

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    voiceInputStartRef.current = input.trim() ? `${input.trimEnd()} ` : ''

    recognition.onresult = (event) => {
      const transcript: string[] = []
      for (let index = 0; index < event.results.length; index += 1) {
        transcript.push(event.results[index][0].transcript)
      }
      setInput(`${voiceInputStartRef.current}${transcript.join(' ')}`.slice(0, 500))
    }

    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone access was denied. Allow access in your browser or type your question.',
        'service-not-allowed': 'Voice input is not available in this browser. Please type your question.',
        'audio-capture': 'No microphone was found. Connect a microphone or type your question.',
        'no-speech': 'No speech was detected. Try speaking again or type your question.',
        network: 'Speech recognition could not connect. Check your connection or type your question.',
      }
      if (event.error !== 'aborted') {
        setSpeechError(messages[event.error] || 'Voice input stopped. Please try again or type your question.')
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null
      setIsListening(false)
    }

    recognitionRef.current = recognition
    setSpeechError(null)
    try {
      recognition.start()
      setIsListening(true)
    } catch {
      recognitionRef.current = null
      setSpeechError('Voice input could not start. Please type your question.')
    }
  }

  function closeChat() {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setIsListening(false)
    setIsOpen(false)
    window.requestAnimationFrame(() => launcherRef.current?.focus())
  }

  async function sendMessage(question: string) {
    const content = question.trim()
    if (!content || isLoading) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }

    const userMessage: DisplayMessage = {
      id: ++nextMessageId.current,
      role: 'user',
      content,
    }
    const conversation = [...messages, userMessage]

    setMessages(conversation)
    setInput('')
    setError(null)
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await askPortfolioAssistant(
        conversation,
        controller.signal,
        conversationContextRef.current,
      )
      conversationContextRef.current = result.context
      setMessages((current) => [
        ...current,
        { id: ++nextMessageId.current, role: 'assistant', content: result.answer },
      ])
    } catch (caughtError) {
      if (!controller.signal.aborted) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'The assistant could not answer. Please try again.',
        )
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setIsLoading(false)
      }
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          ref={launcherRef}
          type="button"
          className="portfolio-chat-launcher"
          aria-controls="portfolio-chat"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9.4 9.4 0 0 1-3.5-.7L4 20l1.5-4A7.5 7.5 0 1 1 20 11.5Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ask about Virat
        </button>
      )}

      {isOpen && (
        <section
          id="portfolio-chat"
          className="portfolio-chat"
          role="dialog"
          aria-modal="false"
          aria-labelledby="portfolio-chat-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeChat()
          }}
        >
          <header className="portfolio-chat-header">
            <div className="portfolio-chat-avatar" aria-hidden="true">VB</div>
            <div className="portfolio-chat-heading">
              <h2 id="portfolio-chat-title">Ask about Virat</h2>
              <p>Answers based on this portfolio</p>
            </div>
            <button type="button" className="portfolio-chat-close" aria-label="Close chat" onClick={closeChat}>
              ×
            </button>
          </header>

          <div ref={messagesRef} className="portfolio-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
            <div className="portfolio-chat-message assistant">
              <div className="portfolio-chat-bubble">
                Hi! Ask me about Virat’s experience, projects, skills, or how to get in touch.
              </div>
            </div>

            {messages.length === 0 && (
              <div className="portfolio-chat-suggestions" aria-label="Suggested questions">
                {suggestedQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => void sendMessage(question)}>
                    {question}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`portfolio-chat-message ${message.role}`}>
                <span className="portfolio-chat-sr-only">
                  {message.role === 'assistant' ? 'Virat’s assistant' : 'You'}
                </span>
                <div className="portfolio-chat-bubble">{message.content}</div>
              </div>
            ))}

            {isLoading && (
              <div className="portfolio-chat-message assistant">
                <div className="portfolio-chat-bubble portfolio-chat-thinking" role="status">
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span className="portfolio-chat-sr-only">Thinking</span>
                </div>
              </div>
            )}
          </div>

          <footer className="portfolio-chat-footer">
            {error && <p className="portfolio-chat-error" role="alert">{error}</p>}
            {speechError && <p className="portfolio-chat-error" role="alert">{speechError}</p>}
            {isListening && (
              <p className="portfolio-chat-listening" role="status">
                <span aria-hidden="true" /> Listening… review the text before sending.
              </p>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void sendMessage(input)
              }}
            >
              <label className="portfolio-chat-sr-only" htmlFor="portfolio-chat-input">
                Ask a question about Virat
              </label>
              <div className="portfolio-chat-composer">
                <textarea
                  ref={inputRef}
                  id="portfolio-chat-input"
                  rows={1}
                  maxLength={500}
                  value={input}
                  readOnly={isListening}
                  placeholder={isListening ? 'Listening…' : 'Ask a question…'}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault()
                      void sendMessage(input)
                    }
                  }}
                />
                <button
                  type="button"
                  className={`portfolio-chat-mic ${isListening ? 'is-listening' : ''}`}
                  aria-label={!speechSupported ? 'Voice input is not supported in this browser' : isListening ? 'Stop voice input' : 'Start voice input'}
                  aria-pressed={isListening}
                  title={!speechSupported ? 'Voice input is not supported in this browser' : isListening ? 'Stop voice input' : 'Speak your question'}
                  disabled={!speechSupported || isLoading}
                  onClick={toggleVoiceInput}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" strokeLinecap="round" />
                  </svg>
                </button>
                <button type="submit" className="portfolio-chat-send" disabled={isLoading || isListening || !input.trim()}>
                  Send
                </button>
              </div>
            </form>
            <p className="portfolio-chat-note">
              {speechSupported ? 'Voice input uses your browser. ' : ''}Google AI can make mistakes.
            </p>
          </footer>
        </section>
      )}
    </>
  )
}
