package com.recruitai.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.recruitai.agent.entity.*;
import com.recruitai.agent.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.util.List;

@Service
@EnableScheduling
public class DataBackupService {

    private static final Logger logger = LoggerFactory.getLogger(DataBackupService.class);
    private static final String DATA_DIR = "data";

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private InterviewRepository interviewRepository;

    @Autowired
    private SkillMatrixRepository skillMatrixRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class) // Ensures DB is ready
    public void init() {
        logger.info("DataBackupService initialized. Checking for existing data...");
        restoreData();
    }

    /**
     * Periodically backup data every 10 minutes
     */
    @Scheduled(fixedRate = 600000)
    public void backupData() {
        logger.info("Starting scheduled data backup...");

        File directory = new File(DATA_DIR);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        backupEntity("candidates", candidateRepository.findAll());
        backupEntity("jobs", jobRepository.findAll());
        backupEntity("resumes", resumeRepository.findAll());
        backupEntity("interviews", interviewRepository.findAll());
        backupEntity("skillmatrices", skillMatrixRepository.findAll());
        backupEntity("auditlogs", auditLogRepository.findAll());
        backupEntity("notifications", notificationRepository.findAll());

        logger.info("Data backup completed successfully.");
    }

    private void backupEntity(String entityName, List<?> data) {
        try {
            if (data.isEmpty())
                return;
            File file = new File(DATA_DIR, entityName + "_dump.json");
            objectMapper.writeValue(file, data);
            logger.info("Backed up {} {} records to {}", data.size(), entityName, file.getAbsolutePath());
        } catch (IOException e) {
            logger.error("Failed to backup {}: {}", entityName, e.getMessage());
        }
    }

    public void restoreData() {
        File directory = new File(DATA_DIR);
        if (!directory.exists()) {
            logger.warn("No data directory found at {}. Skipping restore.", directory.getAbsolutePath());
            return;
        }

        // Only restore if repositories are empty to prevent overwriting new data
        if (candidateRepository.count() == 0) {
            restoreEntity("candidates", new TypeReference<List<Candidate>>() {
            }, candidateRepository);
        }

        if (jobRepository.count() == 0) {
            restoreEntity("jobs", new TypeReference<List<Job>>() {
            }, jobRepository);
        }

        if (resumeRepository.count() == 0) {
            restoreEntity("resumes", new TypeReference<List<Resume>>() {
            }, resumeRepository);
        }

        if (interviewRepository.count() == 0) {
            restoreEntity("interviews", new TypeReference<List<Interview>>() {
            }, interviewRepository);
        }

        if (skillMatrixRepository.count() == 0) {
            restoreEntity("skillmatrices", new TypeReference<List<SkillMatrix>>() {
            }, skillMatrixRepository);
        }

        if (auditLogRepository.count() == 0) {
            restoreEntity("auditlogs", new TypeReference<List<AuditLog>>() {
            }, auditLogRepository);
        }

        if (notificationRepository.count() == 0) {
            restoreEntity("notifications", new TypeReference<List<Notification>>() {
            }, notificationRepository);
        }
    }

    private <T> void restoreEntity(String entityName, TypeReference<List<T>> typeRef,
            org.springframework.data.mongodb.repository.MongoRepository<T, String> repository) {
        File file = new File(DATA_DIR, entityName + "_dump.json");
        if (file.exists()) {
            try {
                logger.info("Restoring {} from absolute path: {}", entityName, file.getAbsolutePath());
                List<T> data = objectMapper.readValue(file, typeRef);
                if (!data.isEmpty()) {
                    logger.info("Found {} records for {}. Saving to repository...", data.size(), entityName);
                    repository.saveAll(data);
                    logger.info("Restored {} {} records from backup.", data.size(), entityName);
                }
            } catch (IOException e) {
                logger.error("Failed to restore {}: {}", entityName, e.getMessage());
            }
        }
    }
}
