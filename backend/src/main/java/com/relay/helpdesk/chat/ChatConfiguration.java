package com.relay.helpdesk.chat;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import com.relay.helpdesk.ticket.SupportTicketTools;

@Configuration
@Profile("prod")
public class ChatConfiguration {
    @Bean
    ChatClient helpdeskChatClient(ChatClient.Builder builder, VectorStore vectorStore, SupportTicketTools ticketTools) {
        return builder
                .defaultAdvisors(QuestionAnswerAdvisor.builder(vectorStore).build())
                .defaultTools(ticketTools)
                .build();
    }
}
