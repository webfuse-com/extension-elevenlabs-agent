window.Agent = (() => {
	navigator.mediaDevices.getUserMedia({ audio: true });


	const FEEDBACK = (() => {
		const ORB_CONFIG = {
			low: {
				colors: [
					[255, 255, 255],
					[117, 139, 253]
				],
				transitionTime: 500,
				morphSpeed: 0.15,
				randomness: 0.2,
				rotationSpeed: 0.05
			},
			high: {
				colors: [
					[117, 139, 253],
					[186, 243, 236],
					[91, 93, 245],
				],
				transitionTime: 2000,
				morphSpeed: 0.9,
				randomness: 0.9,
				rotationSpeed: 0.7
			}
		};

		return {
			disableAISpeakingFeedback() {
				document.body.setAttribute("data-speaking", false);

				document.querySelector("voice-orb")
					.update({
						...ORB_CONFIG["low"],
						transitionTime: 50
					});
			},
			enableAISpeakingFeedback() {
				document.body.setAttribute("data-speaking", true);

				document.querySelector("voice-orb")
					.update({
						...ORB_CONFIG["high"],
						transitionTime: 100
					});
			}
		};
	})();


	const OUTPUT = (() => {
		const AI_TYPE_SPEED_PER_CHAR_MS = 10;

		let lastAIMessage = "";

		// Use streaming for better performance
		function typeMessage(messageEl, remainingMessage, speed) {
			if(!remainingMessage.trim()) return;

			messageEl.textContent += remainingMessage[0];

			const messagesEl = document.querySelector("#messages");
			messagesEl.scrollTo({
				top: messagesEl.scrollHeight
			});

			setTimeout(() => {
				typeMessage(messageEl, remainingMessage.slice(1), speed);
			}, Math.random() * (speed / 2) + (speed / 2));
		}

		function printConversationMessage(source, message) {
			message = message.trim();
			if(!message || message === "...") return;	// user idle

			const messageEl = document.createElement("SPAN");
			messageEl.classList.add("message");
			messageEl.classList.add(`message--${source}`);

			const isAIMessage = (source === "ai");

			if(isAIMessage && (message === lastAIMessage)) return;

			typeMessage(messageEl, message, isAIMessage ? AI_TYPE_SPEED_PER_CHAR_MS : 0);

			lastAIMessage = isAIMessage ? message : lastAIMessage;

			document.querySelector("#messages").appendChild(messageEl);
		}

		return {
			CONVERSATION_HANDLERS: {
				onError(error) {
					console.error(error);
				},
				onConnect() {
					document.body.setAttribute("data-connected", "");
				},
				onDisconnect() {
					document.body.removeAttribute("data-connected");

					printConversationMessage("ai", "CONVERSATION TERMINATED");
				},
				onMessage(message) {
					printConversationMessage(message.source, message.message);

					console.debug(message);
				},
				onModeChange(mode) {
					switch(mode.mode) {
						case "speaking":
							FEEDBACK.enableAISpeakingFeedback();

							break;
						default:
							FEEDBACK.disableAISpeakingFeedback();

							break;
					}
				}
			},
			printConversationMessage
		};
	})();


	const TOOLS = (() => {
		function defineTool(name, automationScope, automationMethod) {
			return {
				[name]: args => {
					console.debug(`[${name}]`, args);

					return browser.tabs
						.sendMessage(0, {
							automationScope,
							automationMethod,
							args
						});
				}
			};
		}

		return {
			CLIENT_TOOLS: {
				...defineTool("take_dom_snapshot", "see", "domSnapshot"),
				...defineTool("mouse_move", "act", "mouseMove"),
				...defineTool("scroll", "act", "scroll"),
				...defineTool("click", "act", "click"),
				...defineTool("type", "act", "type"),
				...defineTool("text_select", "act", "textSelect"),
				...defineTool("navigate", null, "navigate"),
				...defineTool("get_current_location", "custom", "getCurrentLocation"),
			}
		};
	})();


	return (() => {
		let conversation;
		let microphoneOn = false;
		let keyboardOn = false;

		return {
			async start() {
				conversation = await ElevenLabs.Conversation.startSession({
					agentId: browser.webfuseSession.env.AGENT_KEY,
					connectionType: "webrtc",
					clientTools: TOOLS.CLIENT_TOOLS,
					...OUTPUT.CONVERSATION_HANDLERS
				});

				conversation.sendUserActivity();

				const microphoneOn = await browser.runtime.sendMessage({
					type: "microphone"
				});
				conversation.setMicMuted(!microphoneOn);
			},
			async stop() {
				if(!conversation) return;

				await conversation.endSession();
			},
			toggleMicrophone() {
				if(!conversation) return;

				conversation.setMicMuted(microphoneOn);

				microphoneOn = !microphoneOn;

				document.body.setAttribute("data-microphone", microphoneOn.toString());
			},
			toggleKeyboard() {
				if(!conversation) return;

				keyboardOn = !keyboardOn;

				document.body.setAttribute("data-keyboard", keyboardOn.toString());
			},
			submitMessage(message) {
				if(!conversation) return;

				message = message.trim();
				if(!message) return;

				conversation.sendUserMessage(message);

				OUTPUT.printConversationMessage("user", message);
			}
		}
	})();
})();