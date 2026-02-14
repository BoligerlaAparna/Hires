package com.recruitai.agent.ats.service;

import com.recruitai.agent.ats.model.AtsRequest;
import com.recruitai.agent.ats.model.ResumeSource;
import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.service.ResumeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@Service
public class AtsOrchestratorService {

    @Autowired
    private ResumeCollectorService collectorService;

    @Autowired
    private ResumeService resumeService;

    public void triggerCollection(AtsRequest request) {
        try {
            ResumeSource source = ResumeSource.valueOf(request.getSource().toUpperCase());
            collectorService.collectFromSource(source, request.getJobId());
        } catch (Exception e) {
            // Log or handle invalid source
        }
    }

    public Candidate processSingleResume(MultipartFile file, String source, String jobId) throws IOException {
        return resumeService.uploadAndParseResume(file, source, jobId);
    }
}
