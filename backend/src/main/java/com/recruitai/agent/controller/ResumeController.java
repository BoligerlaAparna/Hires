package com.recruitai.agent.controller;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Resume;
import com.recruitai.agent.service.ResumeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    @Autowired
    private ResumeService resumeService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "source", defaultValue = "UPLOAD") String source) {
        try {
            Candidate candidate = resumeService.uploadAndParseResume(file, source);
            return ResponseEntity.ok(candidate);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Internal Server Error: " + e.getMessage());
        } catch (RuntimeException e) {
            e.printStackTrace();
            // Validate failed (Ghost Blocking) -> Return 400 Bad Request with message
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resume> getResume(@PathVariable String id) {
        Resume resume = resumeService.getResumeById(id);
        if (resume == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(resume);
    }
}
