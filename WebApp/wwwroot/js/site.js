class EntityApi {
    constructor(baseUrl = '/api/entities') {
        this.baseUrl = baseUrl;
    }

    async sendRequest(url, options = {}) {
        options.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка API [${response.status}]: ${errorText || response.statusText}`);
        }

        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    async create(entity) {
        return this.sendRequest(this.baseUrl, {
            method: 'POST',
            body: JSON.stringify(entity)
        });
    }

    async update(id, entity) {
        return this.sendRequest(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(entity)
        });
    }

    async delete(id) {
        return this.sendRequest(`${this.baseUrl}/${id}`, {
            method: 'DELETE'
        });
    }
}

class CreatePage {
    constructor(form) {
        this.entityApi = new EntityApi();
        this.createForm = form;
        this.table = document.querySelector('.js-entities-table');
        this.rowTemplate = document.getElementById('rowEntityTemplate');
        const saveButton = this.createForm.querySelector('.js-add-entity');

        saveButton.addEventListener('click', () => this.add(saveButton));

        this.table.addEventListener('click', async event => {
            const target = event.target;

            if (!target.classList.contains('js-remove-entity')) {
                return;
            }

            await this.delete(target);
        });
    }

    async add(button) {
        const formData = new FormData(this.createForm);

        const request = {
            name: formData.get('name'),
            description: formData.get('description'),
            type: formData.get('type')
        };

        button.disabled = true;

        try {
            const id = await this.entityApi.create(request);

            if (id) {
                const row = this.rowTemplate.content.cloneNode(true);
                const td = row.children[0];
                td.children[0].textContent = id;
                td.children[2].textContent = request.description;
                td.children[3].textContent = request.type;
                const button = td.children[4];
                button.dataset.id = id;
                const link = td.children[1].querySelector('a');
                link.textContent = request.name;
                link.href = `/entities/entity/${id}`;

                this.table.querySelector('tbody').append(row);
            }

            this.createForm.reset();
        } catch { }

        button.disabled = false;
    }

    async delete(button) {
        button.disabled = true;
        const id = button.dataset.id;
        const isConfirmed = confirm(`Вы уверены, что хотите удалить сущность с id ${id}`);

        if (isConfirmed) {
            const row = button.closest('tr');
            row.remove();
            await this.entityApi.delete(id);
        } else {
            button.disabled = false;
        }
    }
}

class UpdatePage {
    constructor(form) {
        const saveButton = form.querySelector('.js-update-entity');
        const entityApi = new EntityApi();

        saveButton.addEventListener('click', async () => {
            const formData = new FormData(form);
            const id = form.querySelector('input[name=id]').value;

            const request = {
                name: formData.get('name'),
                description: formData.get('description'),
                type: formData.get('type')
            };

            saveButton.disabled = true;
            try {
                await entityApi.update(id, request);
            } catch { }
            saveButton.disabled = false;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const createForm = document.getElementById('entity-create-form');
    const updateForm = document.getElementById('entity-update-form');

    if (createForm) {
        new CreatePage(createForm);
    }

    if (updateForm) {
        new UpdatePage(updateForm);
    }
});