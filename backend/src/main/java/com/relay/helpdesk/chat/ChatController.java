package com.relay.helpdesk.chat;

import java.io.IOException;
import java.util.List;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.reader.pdf.config.PdfDocumentReaderConfig;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
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
import com.relay.helpdesk.auth.UserAccountService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@Profile("prod")
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final UserAccountService accounts;

    public ChatController(ChatClient chatClient, VectorStore vectorStore, UserAccountService accounts) {
        this.chatClient = chatClient;
        this.vectorStore = vectorStore;
        this.accounts = accounts;
    }

    @PostMapping("/ask")
    public ChatAnswer ask(@Valid @RequestBody ChatQuestion request, Authentication authentication) {
        return answer(request.question(), accounts.findByEmail(authentication.getName()).getId());
    }

    @PostMapping(path = "/ask", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ChatAnswer askWithPdf(
            @RequestPart("question") @NotBlank @Size(max = 4000) String question,
            @RequestPart("file") MultipartFile file,
            Authentication authentication) throws IOException {
        if (file.isEmpty() || !StringUtils.endsWithIgnoreCase(file.getOriginalFilename(), ".pdf")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload a non-empty PDF file.");
        }

        var reader = new PagePdfDocumentReader(
                new ByteArrayResource(file.getBytes()),
                PdfDocumentReaderConfig.builder().withPagesPerDocument(1).build());
        List<Document> pages = reader.read();
        String ownerId = accounts.findByEmail(authentication.getName()).getId();
        pages.forEach(page -> {
            page.getMetadata().put("source", file.getOriginalFilename());
            page.getMetadata().put("ownerId", ownerId);
        });
        vectorStore.add(pages);
        return answer(question, ownerId);
    }

    private ChatAnswer answer(String question, String ownerId) {
        String response = chatClient.prompt()
                .system("You are Relay, a concise and careful customer support assistant. Use retrieved support material when relevant. If it does not contain the answer, say so and suggest creating a support ticket. Never claim a ticket was created unless the ticket API was used.")
                .user(question)
                .advisors(advisors -> advisors.param(QuestionAnswerAdvisor.FILTER_EXPRESSION, "ownerId == '" + ownerId + "'"))
                .call()
                .content();
        return new ChatAnswer(response == null ? "I couldn't generate an answer. Please try again." : response);
    }

    public record ChatQuestion(@NotBlank @Size(max = 4000) String question) { }
    public record ChatAnswer(String answer) { }
}
