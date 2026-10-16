package com.relay.helpdesk.chat;

import java.io.IOException;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.reader.pdf.config.PdfDocumentReaderConfig;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.relay.helpdesk.ticket.SupportTicketTools;

@RestController
@Profile({"local", "free"})
@RequestMapping("/api/chat")
public class LocalChatController {
    private static final int MAX_CONTEXT_CHARACTERS = 28_000;
    private final ObjectProvider<ChatModel> chatModels;
    private final SupportTicketTools ticketTools;

    public LocalChatController(ObjectProvider<ChatModel> chatModels, SupportTicketTools ticketTools) {
        this.chatModels = chatModels;
        this.ticketTools = ticketTools;
    }

    @PostMapping("/ask")
    public ChatController.ChatAnswer ask(@Valid @RequestBody ChatQuestion request) {
        return new ChatController.ChatAnswer(generate(request.question(), ""));
    }

    @PostMapping(path = "/ask", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ChatController.ChatAnswer askWithPdf(
            @RequestPart("question") @NotBlank @Size(max = 4000) String question,
            @RequestPart("file") MultipartFile file) throws IOException {
        if (file.isEmpty() || !StringUtils.endsWithIgnoreCase(file.getOriginalFilename(), ".pdf")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload a non-empty PDF file.");
        }
        List<Document> pages = new PagePdfDocumentReader(
                new ByteArrayResource(file.getBytes()),
                PdfDocumentReaderConfig.builder().withPagesPerDocument(1).build()).read();
        String context = pages.stream().map(Document::getText).reduce("", (left, right) -> left + "\n" + right);
        if (context.length() > MAX_CONTEXT_CHARACTERS) context = context.substring(0, MAX_CONTEXT_CHARACTERS);
        return new ChatController.ChatAnswer(generate(question, context));
    }

    private String generate(String question, String documentContext) {
        ChatModel model = chatModels.getIfAvailable();
        if (model == null) {
            return "Your account and ticket desk are ready. To enable AI answers, set OPENAI_API_KEY and restart the local server.";
        }
        ChatClient client = ChatClient.builder(model).defaultTools(ticketTools).build();
        String system = "You are Relay, a concise customer-support assistant. You may create a support ticket or check a ticket status using the available tools when the user asks. If a PDF context is provided, answer using only that context and say when it does not contain the answer. If no PDF is provided, be helpful but never claim access to private account data. "
                + (documentContext.isBlank() ? "" : "\n\nPDF context:\n" + documentContext);
        String answer = client.prompt().system(system).user(question).call().content();
        return answer == null ? "I couldn't generate an answer. Please try again." : answer;
    }

    public record ChatQuestion(@NotBlank @Size(max = 4000) String question) { }
}
