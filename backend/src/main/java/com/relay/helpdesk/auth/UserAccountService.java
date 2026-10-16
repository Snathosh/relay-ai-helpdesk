package com.relay.helpdesk.auth;

import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserAccountService {
    private final UserAccountRepository repository;
    private final PasswordEncoder passwordEncoder;

    public UserAccountService(UserAccountRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserAccount register(String email, String displayName, String password) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (repository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        return repository.save(new UserAccount(normalizedEmail, displayName.trim(), passwordEncoder.encode(password)));
    }

    public UserAccount findByEmail(String email) {
        return repository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found."));
    }
}
