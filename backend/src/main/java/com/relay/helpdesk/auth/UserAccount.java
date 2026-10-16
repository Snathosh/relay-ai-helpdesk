package com.relay.helpdesk.auth;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_users")
public class UserAccount {
    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(nullable = false, length = 80)
    private String displayName;

    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected UserAccount() { }

    public UserAccount(String email, String displayName, String passwordHash) {
        this.email = email;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
    }

    @PrePersist
    void prepareForInsert() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
}
