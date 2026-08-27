from typing import Literal, Any
from pydantic import BaseModel, Field, model_validator

class MCQOption(BaseModel):
    key: str
    text: str = Field(default="")

    @model_validator(mode="before")
    @classmethod
    def sanitize_option(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "text" not in data and "key" in data and len(data["key"]) > 1:
                # LLM output {"key": "None of the above"} instead of {"key": "D", "text": "..."}
                data["text"] = data["key"]
                data["key"] = "X" # Will be fixed by Question validator
        return data

class QuestionBlueprint(BaseModel):
    topic: str
    subtopic: str
    concept: str
    bloom_level: str
    difficulty: str

class SectionBlueprint(BaseModel):
    section_id: str
    type: str
    questions: list[QuestionBlueprint]

class ExamBlueprint(BaseModel):
    sections: list[SectionBlueprint]

class Question(BaseModel):
    section_id: str
    question_no: int
    type: str
    text: str
    options: list[MCQOption] | None = None
    answer: str
    marks: int
    bloom_level: str
    difficulty: str

    @model_validator(mode="before")
    @classmethod
    def lowercase_enums(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "bloom_level" in data and isinstance(data["bloom_level"], str):
                data["bloom_level"] = data["bloom_level"].lower()
            if "difficulty" in data and isinstance(data["difficulty"], str):
                data["difficulty"] = data["difficulty"].lower()
        return data

    @model_validator(mode="after")
    def validate_mcq_options(self) -> "Question":
        if self.type in ["mcq", "match_the_following"]:
            valid_keys = ["A", "B", "C", "D"]
            if not self.options:
                self.options = [MCQOption(key=k, text=f"Option {k}") for k in valid_keys]
            elif len(self.options) > 4:
                self.options = self.options[:4]
            elif len(self.options) < 4:
                existing_count = len(self.options)
                for i in range(existing_count, 4):
                    self.options.append(MCQOption(key=valid_keys[i], text="None of the above" if i == 3 else f"Option {valid_keys[i]}"))
            
            # Ensure standard A, B, C, D keys
            for i, opt in enumerate(self.options):
                opt.key = valid_keys[i]
                
            # If answer is not A/B/C/D, try to map from text
            if self.answer not in valid_keys:
                mapped = False
                for opt in self.options:
                    if opt.text and self.answer.lower() in opt.text.lower():
                        self.answer = opt.key
                        mapped = True
                        break
                if not mapped:
                    self.answer = "A"
        elif self.type == "true_false":
            if not self.options or len(self.options) < 2:
                self.options = [MCQOption(key="A", text="True"), MCQOption(key="B", text="False")]
            else:
                self.options = self.options[:2]
                self.options[0].key = "A"
                self.options[1].key = "B"
            ans_clean = str(self.answer).strip().lower()
            if "true" in ans_clean or ans_clean in ["a", "t", "1"]:
                self.answer = "A"
            elif "false" in ans_clean or ans_clean in ["b", "f", "0"]:
                self.answer = "B"
            elif self.answer not in ["A", "B"]:
                self.answer = "A"
        else:
            self.options = None
        return self

class GeneratedSection(BaseModel):
    questions: list[Question]

from app.schemas.template import Section

class GeneratedExam(BaseModel):
    exam_id: str | None = None
    subject: str
    grade: str
    total_marks: int
    duration_minutes: int
    heading_details: str | None = None
    instructions: str | None = None
    sections: list[Section] | None = None
    questions: list[Question]
    is_published: bool = False

class ExamGenerationResponse(BaseModel):
    exam: GeneratedExam
